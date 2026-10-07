import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import { OperationsExecutionStepper } from "../app/operate/components/planningExecutionStepper";
import { buildPlanningPageModel } from "../app/operate/planningPageModel";
import { operationsSectionLinks } from "../lib/navigation/planningNavigation";
import { insightDatabase } from "../data/recommendations";

const FINANCE_RUNWAY_TARGETS: string[] = insightDatabase.financeStrategyMode.regimes.map((entry) => entry.runwayPosture);

/*
 * /operate leads with this week's rules (2026-10-07). It opened on an empty
 * stress-test form, with the area table — the pause and resume lines a reader
 * acts on — closed three steps down, and every closed step read as a title and
 * a sentence about the gesture. Read from the page model's element tree, not a
 * render: the stepper is a client component, and what is pinned here is what
 * the page hands it.
 */

/** The props a page hands every `component` in its tree, read without rendering it. */
const propsHandedTo = <P,>(node: ReactNode, component: (props: P) => ReactNode): P[] => {
  if (Array.isArray(node)) return node.flatMap((child: ReactNode) => propsHandedTo(child, component));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === component && isValidElement<P>(node) ? [node.props] : [];
  return [...own, ...propsHandedTo(node.props.children, component)];
};

const loadSteps = async () => {
  const { children } = await buildPlanningPageModel();
  const [stepper] = propsHandedTo(children, OperationsExecutionStepper);
  assert.ok(stepper, "the page hands the stepper its steps");
  return stepper.steps;
};

describe("/operate opening", () => {
  it("leads with each area's rule, then the lists, then the test, all open", async () => {
    const steps = await loadSteps();
    assert.deepEqual(
      steps.slice(0, 3).map((step) => [step.id, step.defaultOpen === true]),
      [
        ["ops-monthly-action-summary", true],
        ["ops-playbook", true],
        ["ops-decision-shield", true],
      ],
    );
    // The rest wait for a click, and the index lists the steps in the order the page draws them.
    assert.ok(steps.slice(3).every((step) => !step.defaultOpen));
    const indexed = operationsSectionLinks.plan.map((link) => link.href.slice(1));
    assert.deepEqual(
      steps.map((step) => step.id),
      indexed.filter((id) => steps.some((step) => step.id === id)),
    );
  });

  it("says on each closed step what is behind it, not what the gesture does", async () => {
    const steps = await loadSteps();
    const description = (id: string) => steps.find((step) => step.id === id)?.description ?? "";

    // The areas the form starts from, by name.
    assert.match(description("ops-plan-lines"), /^Start from the published pause and resume lines for Hiring, .+ and New bets, /);
    // The quarter's runway target, from the same entry the panel draws.
    assert.match(description("ops-finance-strategy"), /\d+\+? months/);
    assert.ok(
      FINANCE_RUNWAY_TARGETS.includes(description("ops-finance-strategy")),
      "the finance step's line is a regime's runway target",
    );
    // The four formats the step copies.
    assert.equal(description("ops-export-briefs"), "Copy this week's brief as Slack, Slide, Citation or Agenda text, ready to paste.");

    for (const retired of [
      "Move the published pause and resume lines to fit your plan, and get an email the day one is crossed.",
      "Budget direction and cash timing for the quarter.",
      "Copy or download the brief in the format you need.",
    ]) {
      assert.ok(!steps.some((step) => step.description === retired), `"${retired}" is back`);
    }
  });
});
