import { cxoFunctionOutputs } from "../../../lib/cxoFunctionOutputs";
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
            className="weather-surface rounded-lg px-4 py-4"
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

export const CxoFunctionPanel = ({
  provenance,
  showProvenance = true,
}: {
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => (
  <section
    id="cxo-functions"
    aria-labelledby="cxo-functions-title"
    className="mt-10 weather-panel p-6"
  >
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="type-label text-slate-400">CXO outputs</p>
        <h3 id="cxo-functions-title" className="type-section text-slate-100">
          Executive function replacement map
        </h3>
      </div>
      {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
    </div>
    <p className="mt-3 max-w-3xl type-data text-slate-300">
      Each module below turns the current posture into practical guidance for finance, operations,
      and product leaders.
    </p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {cxoFunctionOutputs.map((item) => (
        <div
          key={item.role}
          className="weather-surface rounded-lg px-5 py-4"
        >
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{item.role}</p>
          <p className="mt-3 text-sm text-slate-200">{item.focus}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {item.outputs.map((output) => (
              <li key={output} className="flex gap-2">
                <span className="text-slate-400">•</span>
                <span className="break-words">{output}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);
