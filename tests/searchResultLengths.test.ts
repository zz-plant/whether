import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { ROLES, COMPANY_ROLES } from "../lib/report/companyRoles";
import { ROLE_STAGES } from "../lib/report/roleStages";
import { COMPANIES } from "../lib/companies/companyRegistry";
import { signalsClusterStaticParams } from "../app/signals/clusterRoutes";

/*
 * Templated descriptions, held to a result line for every label they are filled with
 * (2026-11-26). A role page ran 209 characters with the longest role, a role-stage page 202,
 * a company-role page 172: a search result cuts at about 160, so the template's last clause
 * was the part nobody saw. Rendered through each route's own `generateMetadata`.
 */
const MAX_DESCRIPTION = 160;

const descriptionOf = (metadata: { description?: string | null }) => metadata.description ?? "";

/* The company with the longest name stands for the rest: the template differs only by name. */
const longestCompany = [...COMPANIES].sort((a, b) => b.name.length - a.name.length)[0];

describe("templated descriptions fit a result line", () => {
  it("on every role page", async () => {
    const { generateMetadata } = await import("../app/roles/[role]/page");
    for (const role of ROLES) {
      const description = descriptionOf(await generateMetadata({ params: Promise.resolve({ role: role.slug }) }));
      assert.ok(description.length > 0 && description.length <= MAX_DESCRIPTION, `${role.slug}: ${description.length}`);
    }
  });

  it("on every role and stage page", async () => {
    const { generateMetadata } = await import("../app/roles/[role]/[stage]/page");
    for (const role of ROLES) {
      for (const stage of ROLE_STAGES) {
        const description = descriptionOf(await generateMetadata({ params: Promise.resolve({ role: role.slug, stage }) }));
        assert.ok(description.length > 0 && description.length <= MAX_DESCRIPTION, `${role.slug}/${stage}: ${description.length}`);
      }
    }
  });

  it("on a company's pages, for the longest company name", async () => {
    assert.ok(longestCompany);
    const companyPage = await import("../app/companies/[company]/page");
    const company = descriptionOf(await companyPage.generateMetadata({ params: Promise.resolve({ company: longestCompany.slug }) }));
    assert.ok(company.length > 0 && company.length <= MAX_DESCRIPTION, `${longestCompany.slug}: ${company.length}`);

    const rolePage = await import("../app/companies/[company]/[role]/page");
    for (const role of COMPANY_ROLES) {
      const description = descriptionOf(
        await rolePage.generateMetadata({ params: Promise.resolve({ company: longestCompany.slug, role: role.slug }) }),
      );
      assert.ok(description.length > 0 && description.length <= MAX_DESCRIPTION, `${longestCompany.slug}/${role.slug}: ${description.length}`);
    }
  });
});

/* "Evidence" was /signals' name until 2026-10-08; its watch pages kept it in their titles. */
describe("signal pages", () => {
  it("title by the watch alone, without the retired section name", async () => {
    const { generateMetadata } = await import("../app/signals/[cluster]/page");
    for (const { cluster } of signalsClusterStaticParams) {
      const metadata = await generateMetadata({ params: Promise.resolve({ cluster }) });
      const title = typeof metadata.title === "string" ? metadata.title : JSON.stringify(metadata.title);
      assert.doesNotMatch(title, /Evidence/, `${cluster}: ${title}`);
    }
  });
});
