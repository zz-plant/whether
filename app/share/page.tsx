import { Fragment } from "react";
import { frameFactsAttributes } from "../../lib/navigation/runningHead";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { Metadata } from "next";
import { formatWeekMondayUTC } from "../../lib/formatters";
import { buildPageMetadata } from "../../lib/seo";
import { PageShell } from "../components/pageShell";
import { ActionLink } from "../components/ui/actionLink";
import { ReusableVisuals } from "./reusableVisuals";
import { findBriefVideo } from "../../lib/export/briefVideo";
import { latestPublishedBrief, publishedBriefWeekLabel } from "../../lib/report/publishedBriefs";
import { SharePageFormats, type ShareFormatOption } from "./sharePageFormats";
import { EmbedBuilder } from "./embedBuilder";
import { ShareImageArtifacts } from "./shareImageArtifacts";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { briefArtifactOf, briefSourceFromReportData, buildBriefDocument } from "../../lib/report/briefDocument";
import { formatBriefArtifact } from "../../lib/report/briefArtifact";
import { briefReadingLines, buildBoardSlideBullets } from "../../lib/export/briefBuilders";
import { buildAreaRows } from "../operate/areaRows";
import { buildPortfolioNote } from "../../lib/export/portfolioNote";
import { buildIssueTrackerMarkdownBrief } from "../../lib/export/issueTrackerBrief";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../../lib/export/weeklyOperatorBrief";
import { buildInvestorUpdateSnippetParts } from "../../lib/export/investorUpdateSnippet";
import { formatSourceFooter } from "../../lib/export/exportTerms";
import { buildAssistantLinks } from "../../lib/export/askAssistant";
import { CALENDAR_FEED_PATH } from "../../lib/export/calendarFeed";
import { buildSocialComposeUrl, formatSocialPost, type SocialNetwork } from "../../lib/export/socialPosts";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";
import { siteUrl } from "../../lib/siteUrl";
import { utilityLinks } from "../../lib/navigation/informationArchitecture";

export const runtime = "edge";
export const revalidate = 300;

// No "| Whether" in the title: the root layout's title template already appends
// it, so carrying the brand here rendered "… | Whether | Whether".
/* Through the shared builder: with no `openGraph` of its own the page inherited
   the root layout's, so a shared /share link previewed as the homepage — its
   title, its description and its URL. The live card is the right one here: the
   page exists to hand this week's brief to someone else. */
export const metadata: Metadata = buildPageMetadata({
  title: "Share this week's guidance",
  description:
    "Copy this week's Whether guidance for Slack, a slide, or a citation; add a meeting pack or calendar hold; or embed a live brief in a newsletter or wiki.",
  path: "/share",
  imageAlt: "This week's Whether guidance",
  imageParams: { template: "report" },
});

/** "fred.stlouisfed.org" for a link's text; the raw string when it is not a URL. */
const describeSourceHost = (source: string) => {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
};

const buildCurrentShareArtifact = async () => {
  const { reportData, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/share" });
  const { assessment, treasury } = reportData;
  /* The week as one document, built once from the persisted call: every text
     format on this page renders it, and the island the share rail reads is its
     artifact half. The area rows, the last week and the readings it carries are
     what the formats' five-area sections and score lines are made of. */
  const document = buildBriefDocument(briefSourceFromReportData(reportData), snapshot.weeklyCall, {
    title: "Whether Weekly Brief",
  });
  const actionStripItems = document.areaRows;
  const weeklyOperatorBrief = buildWeeklyOperatorBriefPlainText(buildWeeklyOperatorBriefPayload(document));
  /* One Slack text for the week: the post the picker offers is the one the
     meeting pack carries. The pack used to paste the Monday post's long form
     beside it, so the page offered two Slack texts with two different calls. */
  const slackPost = formatBriefArtifact(document, "slack", siteUrl);
  /*
   * The issue-tracker form was extracted from `exportBriefPanel.tsx` so it could
   * be tested, and then that panel was deleted — leaving a finished, tested
   * builder that nothing called and no reader could reach. This page is where
   * the formats live.
   */
  const issueTrackerBrief = buildIssueTrackerMarkdownBrief(document);
  /* The same five rows the plan page tabulates, so an area's rule and its
     lines read identically on both surfaces; each row's pause state says which
     side the note prints. */
  const areaRows = buildAreaRows(actionStripItems);
  /* One citation for the week: the one the picker offers. The meeting pack and
     the email carried a second, the answer pages', with a different shape. */
  const citation = formatBriefArtifact(document, "citation", siteUrl);
  // The slide bullets rather than the board brief, which is the Slack brief
  // with the bullets appended: this pack used to paste the same block twice.
  const boardSlideBullets = buildBoardSlideBullets(document);
  // Monthly, against the prior month-end in the regime history, because that
  // is the cadence an investor letter compares itself on. The runway sentence
  // is composed in the browser: this page is cached and cannot read the cookie.
  const investorUpdate = buildInvestorUpdateSnippetParts(document, getMonthlyRegimeHistory());
  /* One sender to many companies, so every runway band rather than the reader's:
     the investor update above runs the other way. */
  const portfolioNote = buildPortfolioNote(document, areaRows);
  const meetingPack = [
    "WEEKLY BRIEF",
    weeklyOperatorBrief,
    "",
    "SLACK POST",
    slackPost,
    "",
    "BOARD SLIDE",
    boardSlideBullets,
    "",
    "CITATION",
    citation,
  ].join("\n");

  return {
    /* The frozen record when there is a current one, so the assistant reads the
       week the reader is looking at even after next Monday's brief is out. */
    assistantLinks: buildAssistantLinks(
      document.provenance.permalink,
      treasury.record_date ? formatWeekMondayUTC(treasury.record_date) : reportData.recordDateLabel,
    ),
    recordDate: treasury.record_date,
    recordDateLabel: reportData.recordDateLabel,
    assessment,
    sourceUrl: treasury.source,
    sourceHost: describeSourceHost(treasury.source),
    // The score lines the pastes below print, shown above the picker so the
    // reader sees what they are about to copy.
    scoreReferences: briefReadingLines(document),
    document,
    // The island the share rail reads: the document's artifact half.
    briefArtifact: briefArtifactOf(document),
    fullBrief: weeklyOperatorBrief,
    /* The brief, then where it came from and where it lives. This carried the
       answer pages' citation, a second one for the week; the picker's would
       print the do-now line as "Guidance" under the brief's own "Guidance", so
       the email closes with the document's source footer instead. */
    emailBrief: [
      "Whether: this week's guidance",
      "",
      weeklyOperatorBrief,
      "",
      formatSourceFooter(document.provenance),
      `Full brief: ${document.provenance.permalink}`,
    ].join("\n"),
    /* A mail client's new message, addressed to no one: the reader picks the
       peer. Short on purpose, because some clients cut or refuse a long mailto
       body; the full brief is one click away at the link. */
    emailComposeUrl: `mailto:?${new URLSearchParams({
      subject: `Whether: this week's guidance (${reportData.recordDateLabel})`,
      body: [
        document.call,
        ...(document.slots.pauseIf ? ["", `${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${document.slots.pauseIf}`] : []),
        "",
        `Full brief: ${document.provenance.permalink}`,
      ].join("\n"),
    })
      .toString()
      .replaceAll("+", "%20")}`,
    meetingPack,
    issueTrackerBrief,
    investorUpdate,
    portfolioNote,
    calendarDetails: [
      "Read this week's Whether guidance.",
      "",
      weeklyOperatorBrief,
      "",
      `Full brief: ${siteUrl}`,
    ].join("\n"),
  };
};

import { SubscribeForm } from "../components/SubscribeForm";

/**
 * The formats, in the picker's order. The share rail's four formats are built
 * here against the canonical site URL rather than in the browser against the
 * window's origin, so the brief link a reader pastes points at the brief and
 * not at a preview host, and the server can render the preview the page opens on.
 */
const buildShareOptions = (artifact: Awaited<ReturnType<typeof buildCurrentShareArtifact>>): ShareFormatOption[] => {
  const brief = (format: Parameters<typeof formatBriefArtifact>[1]) =>
    formatBriefArtifact(artifact.document, format, siteUrl);
  return [
    {
      id: "slack-post",
      group: "Team and tickets",
      label: "Slack post",
      hint: "The guidance and when each area pauses, in a short post people can skim.",
      kind: "text",
      text: brief("slack"),
      copyLabel: "Copy Slack post",
      commitment: "copied_slack",
      preview: "chat",
    },
    {
      id: "full-brief",
      group: "Team and tickets",
      label: "Full brief",
      hint: "Every area's rule and lines, for a channel that wants the whole week.",
      kind: "text",
      text: artifact.fullBrief,
      copyLabel: "Copy full brief",
      commitment: "copied_slack",
      preview: "chat",
    },
    {
      id: "ticket-brief",
      group: "Team and tickets",
      label: "Ticket brief",
      hint: "The guidance in Markdown for a Jira or Linear ticket, or a wiki page.",
      kind: "text",
      text: artifact.issueTrackerBrief,
      copyLabel: "Copy ticket brief",
      commitment: "copied_brief",
    },
    {
      id: "agenda",
      group: "Leadership and board",
      label: "Monday agenda",
      hint: "A three-minute Monday item for Notion, Docs or a meeting doc.",
      kind: "text",
      text: brief("agenda"),
      copyLabel: "Copy agenda",
      commitment: "copied_meeting",
      offersCalendar: true,
    },
    {
      id: "slide-text",
      group: "Leadership and board",
      label: "Slide text",
      hint: "A Markdown callout for a deck, Notion or Docs. The slide as a file or a picture is under Files and images, below.",
      kind: "text",
      text: brief("slide"),
      copyLabel: "Copy slide text",
      commitment: "copied_brief",
    },
    {
      id: "meeting-pack",
      group: "Leadership and board",
      label: "Meeting pack",
      hint: "The brief, the Slack post, the board slide's bullets and the citation, in one paste for a meeting doc.",
      kind: "text",
      text: artifact.meetingPack,
      copyLabel: "Copy meeting pack",
      commitment: "copied_meeting",
      offersCalendar: true,
    },
    {
      id: "email",
      group: "Leadership and board",
      label: "Email",
      hint: "The full brief with its source and permanent link, for a leadership note.",
      kind: "text",
      text: artifact.emailBrief,
      copyLabel: "Copy email",
      commitment: "copied_email",
      compose: { label: "Send it to a peer", href: artifact.emailComposeUrl },
    },
    {
      id: "investor-update",
      group: "Investors and portfolio",
      label: "For your investors",
      hint: "Two paragraphs for a monthly letter: the conditions and how they moved since the end of last month, then the guidance and what your runway band means for it.",
      kind: "investor",
      parts: artifact.investorUpdate,
      copyLabel: "Copy investor update",
    },
    {
      id: "portfolio-note",
      group: "Investors and portfolio",
      label: "For your portfolio",
      hint: "For an investor or accelerator writing to the companies it backs: each area's rule, a note on the week for every runway band, and a link for each company to set its own lines.",
      kind: "text",
      text: artifact.portfolioNote,
      copyLabel: "Copy portfolio note",
      commitment: "copied_brief",
    },
    {
      id: "citation",
      group: "Citation and social",
      label: "Citation",
      hint: "A dated reference with a link to the permanent record.",
      kind: "text",
      text: brief("citation"),
      copyLabel: "Copy citation",
      commitment: "copied_brief",
    },
    ...SOCIAL_FORMATS.map(({ network, label, hint }): ShareFormatOption => {
      const text = formatSocialPost(artifact.document, network, siteUrl);
      return {
        id: `${network}-post`,
        group: "Citation and social" as const,
        label,
        hint,
        kind: "text",
        text,
        copyLabel: `Copy ${label} text`,
        commitment: "copied_social",
        compose: { label: `Open in ${SOCIAL_NETWORK_NAMES[network]}`, href: buildSocialComposeUrl(network, text) },
      };
    }),
  ];
};

const SOCIAL_NETWORK_NAMES: Record<SocialNetwork, string> = { linkedin: "LinkedIn", x: "X", bluesky: "Bluesky" };

const SOCIAL_FORMATS: readonly { network: SocialNetwork; label: string; hint: string }[] = [
  {
    network: "linkedin",
    label: "LinkedIn post",
    hint: "For your own feed: the conditions and the guidance in the two lines LinkedIn shows before \"see more,\" then the pause line, each area's rule, and the source.",
  },
  {
    network: "x",
    label: "X post",
    hint: "Fits in 280 characters with the link. When the week runs long, the pause line drops first and the guidance is cut to its first sentence.",
  },
  {
    network: "bluesky",
    label: "Bluesky post",
    hint: "Fits in 300 characters with the link, cut the same way as the X post.",
  },
];

const apiLink = utilityLinks.find((link) => link.href === "/api-docs");

export default async function SharePage() {
  const artifact = await buildCurrentShareArtifact();
  const video = latestPublishedBrief ? await findBriefVideo(latestPublishedBrief) : undefined;

  return (
    <PageShell backdropVariant="default">
      {/* The share rail's island: the global Share button reads it on this page too. */}
      <BriefArtifactScript artifact={artifact.briefArtifact} />
      <div className="weather-page-stack mx-auto max-w-6xl">
        <section
          className="weather-panel weather-section-stack p-0"
          aria-labelledby="share-page-title"
          {...frameFactsAttributes({
            regime: artifact.assessment.regime,
            condition: getRegimePublicLabel(artifact.assessment.regime),
            date: `Week of ${artifact.recordDate ? formatWeekMondayUTC(artifact.recordDate) : artifact.recordDateLabel}`,
            title: "Share this week's guidance",
          })}
        >
          <div className="max-w-2xl space-y-2">
            {/* The week is part of the heading line (2026-10-09). It was a kicker
                above it, and before that the kicker read "Current weekly
                artifact", the product's internal noun for what a reader calls
                the brief. */}
            {/* Its own line since 2026-10-21: run on after the title in a 42rem
                column, the unbreakable "· Week of …" wrapped whole and opened the
                second line on a stray dot at desktop widths. */}
            <h1 id="share-page-title" className="text-fluid-2xl font-semibold text-white/90">
              Share this week&apos;s guidance
              <span className="sr-only">, </span>
              <span className="mt-1 block text-fluid-lg font-normal text-slate-400">
                Week of {artifact.recordDate ? formatWeekMondayUTC(artifact.recordDate) : artifact.recordDateLabel}
              </span>
            </h1>
            <p className="text-sm leading-relaxed text-white/60">
              Paste it into Slack, a meeting doc, a ticket or a letter. Every format carries the same
              pause and restart rules and names its source:{" "}
              {/* A link named for the host, not a bare URL printed as text. */}
              <a href={artifact.sourceUrl} className="text-sky-300 underline-offset-2 hover:underline">
                {artifact.sourceHost}
              </a>
              .
            </p>
          </div>
        </section>

        <SharePageFormats
          scoreReferences={artifact.scoreReferences}
          options={buildShareOptions(artifact)}
          calendar={{
            title: `Whether Weekly Brief review — ${artifact.recordDate}`,
            details: artifact.calendarDetails,
            feedUrl: `${siteUrl}${CALENDAR_FEED_PATH}`,
          }}
        />

        {/* Text formats first, then the same call as a picture or a file. */}
        <ShareImageArtifacts />
        <ReusableVisuals video={video} weekLabel={latestPublishedBrief ? publishedBriefWeekLabel(latestPublishedBrief) : undefined} />

        {/* Anchored so the retired /embed route lands on it. */}
        <section id="embed" className="weather-panel weather-section-stack p-0">
          <EmbedBuilder />
        </section>
        {/* The rest of "Use it elsewhere": the same reading for an agent, a
            script or a feed reader. The API page was a header menu item of its
            own until 2026-10-08. */}
        <nav aria-labelledby="share-elsewhere-heading" className="weather-panel weather-section-stack p-0">
          <h2 id="share-elsewhere-heading" className="type-section">For agents, scripts and feed readers</h2>
          <p className="text-sm text-slate-300">
            Ask an assistant what this week means for your company:{" "}
            {artifact.assistantLinks.map((link, index) => (
              <Fragment key={link.name}>
                {/* NBSP before the dot, so a wrap never opens a line on "· Perplexity". */}
                {index > 0 ? "\u00A0· " : null}
                <ActionLink href={link.href} variant="inline" target="_blank" rel="noreferrer">
                  {link.name}
                </ActionLink>
              </Fragment>
            ))}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {apiLink ? (
              <li>
                <ActionLink href={apiLink.href} variant="inline">{apiLink.label}</ActionLink>
                <span className="ml-2 text-xs text-white/60">{apiLink.description}</span>
              </li>
            ) : null}
            <li>
              {/* A file, not a page: the absolute address the feed autodiscovery
                  link in the layout's <head> names. */}
              <a href={`${siteUrl}/feed.xml`} className="inline-flex min-h-[44px] items-center text-fluid-sm font-semibold text-sky-300 hover:text-sky-200">RSS</a>
            </li>
            {/* The calendar feed's two links stood here too until 2026-11-11; the
                subscribe form directly below prints the same pair. */}
          </ul>
        </nav>
        <SubscribeForm />
      </div>
    </PageShell>
  );
}
