// Real third-party API call: resolves rough geo/ISP info for a monitored host via ip-api.com (free, no key).
export interface GeoInfo {
  country: string | null;
  city: string | null;
  isp: string | null;
}

const EMPTY_GEO: GeoInfo = { country: null, city: null, isp: null };

export async function lookupGeo(hostname: string): Promise<GeoInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(hostname)}?fields=status,country,city,isp`,
      { signal: controller.signal }
    );
    if (!response.ok) return EMPTY_GEO;

    const data = (await response.json()) as {
      status: string;
      country?: string;
      city?: string;
      isp?: string;
    };
    if (data.status !== "success") return EMPTY_GEO;

    return {
      country: data.country ?? null,
      city: data.city ?? null,
      isp: data.isp ?? null,
    };
  } catch (err) {
    console.warn(`geo lookup failed for ${hostname}:`, (err as Error).message);
    return EMPTY_GEO;
  } finally {
    clearTimeout(timeout);
  }
}
