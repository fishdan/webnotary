import { isIP } from "node:net";

export class NetPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetPolicyError";
  }
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number(p));
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function inCidrV4(ip: string, base: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

/** Returns true if the address is safe to dial for public HTTPS observation. */
export function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    if (inCidrV4(ip, "0.0.0.0", 8)) return false;
    if (inCidrV4(ip, "10.0.0.0", 8)) return false;
    if (inCidrV4(ip, "127.0.0.0", 8)) return false;
    if (inCidrV4(ip, "169.254.0.0", 16)) return false; // link-local + metadata
    if (inCidrV4(ip, "172.16.0.0", 12)) return false;
    if (inCidrV4(ip, "192.168.0.0", 16)) return false;
    if (inCidrV4(ip, "100.64.0.0", 10)) return false; // CGNAT
    if (inCidrV4(ip, "192.0.0.0", 24)) return false;
    if (inCidrV4(ip, "192.0.2.0", 24)) return false; // TEST-NET
    if (inCidrV4(ip, "198.51.100.0", 24)) return false;
    if (inCidrV4(ip, "203.0.113.0", 24)) return false;
    if (inCidrV4(ip, "224.0.0.0", 4)) return false; // multicast
    if (inCidrV4(ip, "240.0.0.0", 4)) return false; // reserved
    return true;
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return false;
    if (normalized === "::") return false;
    // Unique local fc00::/7, link-local fe80::/10, multicast ff00::/8
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
      return false;
    }
    if (normalized.startsWith("ff")) return false;
    // IPv4-mapped
    if (normalized.startsWith(":ffff:")) {
      const v4 = normalized.slice(normalized.lastIndexOf(":") + 1);
      // handle :ffff:a.b.c.d
      const mapped = normalized.includes(".")
        ? normalized.substring(normalized.lastIndexOf(":") > 6 ? normalized.lastIndexOf("ffff:") + 5 : 7)
        : null;
      const maybeV4 = normalized.match(/:ffff:(\d+\.\d+\.\d+\.\d+)$/i);
      if (maybeV4?.[1]) return isPublicIp(maybeV4[1]);
      void v4;
      void mapped;
    }
    return true;
  }

  return false;
}

export function assertPublicIps(ips: string[], context: string): string[] {
  const publicIps = ips.filter((ip) => isPublicIp(ip));
  if (publicIps.length === 0) {
    throw new NetPolicyError(`no public addresses for ${context} (resolved: ${ips.join(", ") || "none"})`);
  }
  return publicIps;
}

export function assertIpStillAllowed(ip: string, allowed: Set<string>): void {
  if (!allowed.has(ip) || !isPublicIp(ip)) {
    throw new NetPolicyError(`refusing to connect to ${ip}: failed public-IP / rebinding check`);
  }
}
