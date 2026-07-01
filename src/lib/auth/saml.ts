import { randomUUID } from "node:crypto";
import { SAML, ValidateInResponseTo, generateServiceProviderMetadata } from "@node-saml/node-saml";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/http";
import type { CurrentUser } from "@/lib/auth/session";

function samlCallbackUrl() {
  return `${env.appBaseUrl.replace(/\/$/, "")}/auth/saml/acs`;
}

function assertSamlConfigured() {
  if (!env.ping.entryPoint || !env.ping.idpCert) {
    throw new AppError("Ping SAML is niet volledig geconfigureerd", 503, "SAML_NOT_CONFIGURED");
  }
}

export function createSamlClient() {
  assertSamlConfigured();
  return new SAML({
    callbackUrl: samlCallbackUrl(),
    entryPoint: env.ping.entryPoint!,
    issuer: env.ping.issuer,
    idpCert: env.ping.idpCert!,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    validateInResponseTo: ValidateInResponseTo.always,
    requestIdExpirationPeriodMs: 10 * 60 * 1000,
    signatureAlgorithm: "sha256"
  });
}

export async function createRelayState(returnTo?: string) {
  const relayState = randomUUID();
  await prisma.authState.create({
    data: {
      relayState,
      returnTo,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });
  return relayState;
}

export async function consumeRelayState(relayState: string | undefined) {
  if (!relayState) {
    return "/dashboard";
  }

  const state = await prisma.authState.findUnique({ where: { relayState } });
  if (!state) {
    return "/dashboard";
  }

  await prisma.authState.delete({ where: { relayState } }).catch(() => undefined);
  if (state.expiresAt.getTime() < Date.now()) {
    return "/dashboard";
  }

  return state.returnTo ?? "/dashboard";
}

function values(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap(values);
  }
  if (typeof input === "string") {
    return [input];
  }
  return [];
}

export function profileToUser(profile: unknown): CurrentUser {
  const record = (profile ?? {}) as Record<string, unknown>;
  const email = values(record.email ?? record.mail ?? record.nameID ?? record["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"])[0];
  const name = values(record.displayName ?? record.cn ?? record.name ?? record["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"])[0];
  const groups = values(record[env.ping.groupAttribute] ?? record.groups ?? record.memberOf);

  if (!email) {
    throw new AppError("SAML-profiel bevat geen e-mailadres", 403, "SAML_EMAIL_MISSING");
  }

  const allowed = new Set(env.ping.allowedGroups);
  const allowedGroups = groups.filter((group) => allowed.has(group));
  if (allowedGroups.length === 0) {
    throw new AppError("SAML-profiel bevat geen toegestane groep", 403, "SAML_GROUP_FORBIDDEN");
  }

  return {
    email,
    name,
    groups: allowedGroups
  };
}

export function serviceProviderMetadata() {
  if (env.ping.publicCert) {
    return generateServiceProviderMetadata({
      issuer: env.ping.issuer,
      callbackUrl: samlCallbackUrl(),
      logoutCallbackUrl: `${env.appBaseUrl.replace(/\/$/, "")}/auth/logout`,
      identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      wantAssertionsSigned: true,
      privateKey: env.ping.privateKey,
      publicCerts: env.ping.publicCert,
      signatureAlgorithm: "sha256"
    });
  }

  return generateServiceProviderMetadata({
    issuer: env.ping.issuer,
    callbackUrl: samlCallbackUrl(),
    logoutCallbackUrl: `${env.appBaseUrl.replace(/\/$/, "")}/auth/logout`,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    wantAssertionsSigned: true
  });
}
