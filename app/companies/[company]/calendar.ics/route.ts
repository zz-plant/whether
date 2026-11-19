import { readCompanyRecord, pilotPeerGrowth } from "../../../../lib/companies/companyFilingStore";
import { findCompany } from "../../../../lib/companies/companyRegistry";
import { buildCompanyCalendarFeed } from "../../../../lib/export/calendarFeed";
import { buildCompanySituation } from "../../../../lib/report/companySituation";

export const revalidate = 3600;

/** A company's planning year as a subscribed calendar (`buildCompanyCalendarFeed`). */
export async function GET(_request: Request, { params }: { params: Promise<{ company: string }> }) {
  const company = findCompany((await params).company);
  if (!company) return new Response("Not found", { status: 404 });
  const now = new Date();
  const figures = await readCompanyRecord(company);
  const situation = figures
    ? buildCompanySituation(company, figures, pilotPeerGrowth(), now)
    : { fiscalYear: null, nextReports: [] };
  return new Response(buildCompanyCalendarFeed(company, situation, now), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${company.slug}-planning.ics"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
