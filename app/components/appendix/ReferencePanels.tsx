import { operatorRequests } from "../../../lib/operatorRequests";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";

export const OperatorRequestsPanel = ({
  provenance,
  showProvenance = true,
}: {
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
  const backlogRequests = operatorRequests.filter((request) => request.status === "BACKLOG");

  return (
    <section
      id="operator-requests"
      aria-labelledby="operator-requests-title"
      className="mt-10 weather-panel p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="type-label text-slate-400">Requests</p>
          <h3 id="operator-requests-title" className="type-section text-slate-100">
            What operators have asked for next
          </h3>
        </div>
        {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
      </div>
      <p className="mt-3 max-w-3xl type-data text-slate-300">
        These are the most common expansion requests expected after launch, curated to highlight
        what remains outstanding while keeping traceable data sources and plain-English operational
        guidance front and center.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {backlogRequests.map((request) => (
          <div
            key={request.title}
            className="weather-surface px-4 py-4"
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              {request.title}
            </p>
            <p className="mt-2 text-sm text-slate-200">{request.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
