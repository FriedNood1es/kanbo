"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/react";
import type { DragEndEvent, DragOverEvent } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import type { Application } from "@/generated/prisma";
import { applicationStages } from "@/lib/validation";
import { computePosition } from "@/lib/position";
import { cardTilt } from "@/lib/tilt";
import KanbanColumn from "@/components/board/KanbanColumn";
import BoardStats from "@/components/board/BoardStats";
import ApplicationForm from "@/components/applications/ApplicationForm";
import { moveApplication } from "@/actions/board";
import { deleteApplication } from "@/actions/applications";
import { seedDemoApplications } from "@/actions/demo";
import { stageMeta, type Stage } from "@/lib/stages";
import { getAttentionBadge } from "@/lib/staleness";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import KanboMark from "@/components/ui/KanboMark";

const MOVE_ERROR_MS = 4000;
// Remembered per demo session so the nudge stays gone after the first drag,
// even across a refresh, without following the visitor out of demo mode.
const DRAG_HINT_KEY = "kanbo-demo-drag-hint-done";

// Module scope so the sensor descriptors keep a stable identity across
// renders — recreating them per render would reconfigure the drag manager
// mid-gesture.
const boardSensors = [
  PointerSensor.configure({
    // A small travel threshold before lift so plain clicks don't grab the
    // card (Trello waits a few px too). Touch keeps a long-press delay so
    // scrolling the board on mobile doesn't start a drag instead.
    activationConstraints: (event) =>
      event.pointerType === "touch"
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 8 })]
        : [new PointerActivationConstraints.Distance({ value: 6 })],
    // Pointerdown listens on these elements (defaults to the handle alone).
    // Including the card element is what makes the whole card grabbable;
    // the handle stays as-is so the keyboard drag path is untouched.
    activatorElements: (source) => [source.handle, source.element],
    // Cards grab anywhere, so clicks on their interactive descendants must
    // never arm a drag — including the scrollable notes region, where a
    // mouse-drag means "scroll the note," not "lift the card." The handle
    // and the card surface itself always stay activatable: without those
    // carve-outs (which the library default has and a plain override
    // drops), pressing the grip button matches "button" below and no drag
    // can ever start.
    preventActivation: (event, source) => {
      const target = event.target;
      if (!(target instanceof Element)) return false;
      if (target === source.element) return false;
      const handle = source.handle;
      if (handle && (target === handle || handle.contains(target))) return false;
      return (
        target.closest(
          "button, a, input, textarea, select, [contenteditable], [data-no-drag]",
        ) !== null
      );
    },
  }),
  KeyboardSensor,
];

// Field-by-field rather than a single `updatedAt` comparison: a drag's local
// optimistic update only patches stage/position, leaving its `updatedAt`
// stale, so comparing timestamps would treat every post-drag server refetch
// as "changed" and force a full-board resync (defeating the optimization
// below). Comparing the actual editable fields catches edits made through
// the form (company, role, jobUrl, notes, dates) without false-positiving on
// a drag whose optimistic copy already matches on everything that changed.
function sameApplication(a: Application, b: Application) {
  return (
    a.company === b.company &&
    a.role === b.role &&
    a.jobUrl === b.jobUrl &&
    a.notes === b.notes &&
    a.stage === b.stage &&
    a.position === b.position &&
    a.appliedAt.getTime() === b.appliedAt.getTime() &&
    (a.followUpAt?.getTime() ?? null) === (b.followUpAt?.getTime() ?? null)
  );
}

export default function KanbanBoard({
  applications: initial,
  olderRejected = [],
  ghostedIds = [],
  query = "",
  isDemo = false,
}: {
  applications: Application[];
  olderRejected?: { id: string; daysAgo: number }[];
  ghostedIds?: string[];
  query?: string;
  isDemo?: boolean;
}) {
  const [applications, setApplications] = useState(initial);
  const normalizedQuery = query.trim().toLowerCase();
  const [isSeeding, startSeeding] = useTransition();

  // Server-computed rejection ages for collapsed old cards. A Map for O(1)
  // lookup per card; empty while searching so matches are never hidden.
  const olderRejectedAges = useMemo(
    () =>
      normalizedQuery
        ? new Map<string, number>()
        : new Map(olderRejected.map((o) => [o.id, o.daysAgo] as const)),
    [olderRejected, normalizedQuery],
  );

  // Server-computed ghost ids for the graveyard toggle. Same contract as
  // above: ghosts tuck away per column, searching shows everything. A ghost
  // can never be old-rejected and vice versa (ghosting excludes REJECTED),
  // so no column ever shows both toggles.
  const ghostedIdSet = useMemo(
    () => (normalizedQuery ? new Set<string>() : new Set(ghostedIds)),
    [ghostedIds, normalizedQuery],
  );

  // Distinct values for the form's autocomplete — derived from the board's
  // own rows, so suggestions need no fetch and no data ever leaves the app.
  const allCompanies = useMemo(
    () =>
      Array.from(new Set(applications.map((a) => a.company))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [applications],
  );
  const allRoles = useMemo(
    () =>
      Array.from(
        new Set(applications.map((a) => a.role).filter((r): r is string => !!r)),
      ).sort((a, b) => a.localeCompare(b)),
    [applications],
  );

  // Demo-only nudge toward the app's signature interaction; hidden once the
  // visitor drags anything (see dismissDragHint in handleDragEnd).
  const [showDragHint, setShowDragHint] = useState(false);
  useEffect(() => {
    if (isDemo && initial.length > 0 && !sessionStorage.getItem(DRAG_HINT_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is browser-only and can't be read during SSR/render, so this one-time check belongs in a mount effect.
      setShowDragHint(true);
    }
  }, [isDemo, initial.length]);

  function dismissDragHint() {
    setShowDragHint((shown) => {
      if (shown) sessionStorage.setItem(DRAG_HINT_KEY, "1");
      return false;
    });
  }

  // A card moving to a different stage unmounts it from its old column's
  // React tree and mounts a fresh instance in the new column's tree (they're
  // separate parents — key-based reconciliation only dedupes within the same
  // parent), which used to replay the `card-enter` mount animation on every
  // cross-column drop. knownCardIds tracks which ids have ever been seen so
  // the animation only fires for genuinely new cards, not remounts caused by
  // a stage change.
  const knownCardIds = useRef<Set<string>>(new Set());
  const newCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of applications) {
      // Safe despite the lint rule: this only ever adds ids further down in
      // the effect below, so a discarded/replayed render at worst computes
      // one extra id as "new" — it can't corrupt state, only skip an
      // entrance animation that would otherwise have played.
      // eslint-disable-next-line react-hooks/refs
      if (!knownCardIds.current.has(a.id)) ids.add(a.id);
    }
    return ids;
  }, [applications]);
  useEffect(() => {
    newCardIds.forEach((id) => knownCardIds.current.add(id));
  }, [newCardIds]);

  function handleSeedDemo() {
    startSeeding(async () => {
      await seedDemoApplications();
    });
  }

  const [moveError, setMoveError] = useState<string | null>(null);
  const moveErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deletion is confirmed inline on the card itself (see ApplicationCard), so
  // by the time this runs the user has already committed — drop the row from
  // local state immediately and persist. Removing it locally (rather than
  // waiting on the server round-trip's revalidation) keeps the card from
  // lingering until the refetch lands.
  function requestDelete(application: Application) {
    deleteApplication(application.id);
    setApplications((prev) => prev.filter((a) => a.id !== application.id));
  }

  function matchesQuery(application: Application) {
    if (!normalizedQuery) return true;
    return (
      application.company.toLowerCase().includes(normalizedQuery) ||
      (application.role?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  }

  // KanbanBoard keeps its own copy of applications so drag-and-drop can update
  // it optimistically — but that means it also has to resync whenever the
  // server sends fresh data (e.g. after adding or editing an application,
  // whose actions do trigger a revalidated refetch), or the local copy just
  // goes stale. Implemented with React's "adjust state during render" pattern
  // (compare the incoming `initial` prop to the previous one) rather than an
  // effect, so the reconciliation lands in the same render that receives the
  // new data instead of a frame later.
  //
  // Guarded to skip replacing state with data that's already identical to
  // what's shown: swapping in a fresh array (new object identities for every
  // card, even unchanged ones) can needlessly remount cards mid-animation
  // elsewhere on the board.
  //
  // Drag-and-drop and delete deliberately do *not* trigger this path — they
  // call their Server Actions as bare, un-awaited promises rather than
  // through a transition, purely for persistence. The optimistic local
  // update already fully determines the correct UI state, and forcing a
  // round-trip-gated re-render of the whole board on every drop was both
  // slow (a full Server Component refetch on every single drag) and, on a
  // slower connection, opened a wider window for a `@dnd-kit/react` timing
  // issue (see the per-card key in KanbanColumn.tsx) to actually surface.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setApplications((current) => {
      if (current.length !== initial.length) return initial;
      const currentById = new Map(current.map((a) => [a.id, a]));
      const unchanged = initial.every((a) => {
        const existing = currentById.get(a.id);
        return existing && sameApplication(existing, a);
      });
      return unchanged ? current : initial;
    });
  }

  function columnItems(stage: Stage, excludeId?: string) {
    return applications
      .filter((a) => a.stage === stage && a.id !== excludeId)
      .sort((a, b) => a.position - b.position);
  }

  // Snapshot of the board when the current drag started — the rollback target
  // for a canceled drag or a failed persist, since the live preview below
  // mutates `applications` mid-drag.
  const dragSnapshot = useRef<Application[] | null>(null);

  // Maps a hovered drop target to the stage/position a drop would commit.
  // Shared by the preview and the commit so the two can never disagree.
  // Null means "no visible change" — hovering the card itself, or a target
  // that resolves to the card's current slot.
  function placementFor(
    items: Application[],
    activeId: string,
    overId: string,
    overStage?: Stage,
  ): { active: Application; newStage: Stage; newPosition: number } | null {
    if (overId === activeId) return null;
    const active = items.find((a) => a.id === activeId);
    if (!active) return null;
    const newStage: Stage = overStage ?? active.stage;
    const siblings = items
      .filter((a) => a.stage === newStage && a.id !== activeId)
      .sort((a, b) => a.position - b.position);
    const overIndex = siblings.findIndex((a) => a.id === overId);
    const insertIndex = overIndex === -1 ? siblings.length : overIndex;
    const newPosition = computePosition(
      siblings[insertIndex - 1]?.position,
      siblings[insertIndex]?.position,
    );
    if (newStage === active.stage && newPosition === active.position) return null;
    return { active, newStage, newPosition };
  }

  function applyPlacement(
    prev: Application[],
    placement: { active: Application; newStage: Stage; newPosition: number },
  ): Application[] {
    return prev.map((a) =>
      a.id === placement.active.id
        ? { ...a, stage: placement.newStage, position: placement.newPosition }
        : a,
    );
  }

  function handleDragStart() {
    dragSnapshot.current = applications;
  }

  // Live reorder preview: apply the same placement a drop would commit, so
  // siblings part around the dragged card mid-drag. Pure React state — unlike
  // the DOM-mutating sort plugin this replaces, every node stays reconciled,
  // so cancel is a plain state restore and rapid drags can't desync the DOM.
  function handleDragOver(event: DragOverEvent) {
    const { source, target } = event.operation;
    if (!source || !target) return;
    const overStage = (target.data as { stage?: Stage } | undefined)?.stage;
    const activeId = String(source.id);
    const overId = String(target.id);
    setApplications((prev) => {
      const placement = placementFor(prev, activeId, overId, overStage);
      return placement ? applyPlacement(prev, placement) : prev;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { operation, canceled } = event;
    const { source, target } = operation;
    const snapshot = dragSnapshot.current;
    dragSnapshot.current = null;

    if (!source || !target || canceled) {
      if (canceled && snapshot) setApplications(snapshot);
      return;
    }

    // They've discovered dragging — retire the hint even if this particular
    // drop is a no-op that returns below.
    dismissDragHint();

    const activeId = String(source.id);
    const overId = String(target.id);
    const overStage = (target.data as { stage?: Stage } | undefined)?.stage;

    const placement = placementFor(applications, activeId, overId, overStage);
    if (!placement) return;

    setApplications((prev) => applyPlacement(prev, placement));

    moveApplication({
      id: activeId,
      stage: placement.newStage,
      position: placement.newPosition,
    }).then((result) => {
      if (result.success) return;
      if (snapshot) setApplications(snapshot);
      if (moveErrorTimer.current) clearTimeout(moveErrorTimer.current);
      setMoveError(`Couldn't save that move: ${result.error}`);
      moveErrorTimer.current = setTimeout(() => {
        setMoveError(null);
        moveErrorTimer.current = null;
      }, MOVE_ERROR_MS);
    });
  }

  const isEmpty = applications.length === 0;

  return (
    <DragDropProvider
      sensors={boardSensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-ground-raised px-6 py-16 text-center">
            <KanboMark className="h-10 w-10 opacity-70" />
            <div>
              <h2 className="text-lg font-semibold text-ink">Your board is empty</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-dim">
                Track applications as they move from Applied to Interviewing to Offer — drag
                cards between columns as things progress.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <ApplicationForm
                companies={allCompanies}
                roles={allRoles}
                trigger={
                  <Button type="button" data-tour="add-application">
                    Add your first application
                  </Button>
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSeedDemo}
                disabled={isSeeding}
              >
                {isSeeding ? "Loading…" : "Load example cards"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {showDragHint && (
              <div className="flex items-center gap-2.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-ink-dim">
                <span aria-hidden className="animate-pulse text-base leading-none text-accent">
                  ⇄
                </span>
                <span>
                  <span className="font-semibold text-ink">Try it:</span> grab a card
                  and drag it to another column.
                </span>
                <button
                  type="button"
                  onClick={dismissDragHint}
                  aria-label="Dismiss tip"
                  className="relative ml-auto shrink-0 text-lg leading-none text-ink-faint hover:text-ink after:absolute after:-inset-3 after:content-['']"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <BoardStats applications={applications} />
              <ApplicationForm
                companies={allCompanies}
                roles={allRoles}
                trigger={
                  <Button type="button" data-tour="add-application">
                    Add application
                  </Button>
                }
              />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2">
              {applicationStages.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  applications={columnItems(stage).filter(matchesQuery)}
                  emptyMessage={normalizedQuery ? "No matches" : "No applications yet"}
                  onDeleteRequest={requestDelete}
                  newCardIds={newCardIds}
                  companies={allCompanies}
                  roles={allRoles}
                  olderAges={stage === "REJECTED" ? olderRejectedAges : undefined}
                  ghostIds={stage === "REJECTED" ? undefined : ghostedIdSet}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {moveError && <Toast message={moveError} />}

      {/* Floating clone that follows the pointer while the source card stays
          behind as a dimmed placeholder — the lift Trello has and an in-place
          transform can't give. Deliberately lightweight (no buttons or forms):
          it's a drag ghost, not a second interactive card. */}
      <DragOverlay>
        {(source) => {
          const app = applications.find((a) => a.id === String(source.id));
          if (!app) return null;
          const olderDaysAgo = olderRejectedAges.get(app.id);
          const appGhosted = getAttentionBadge(app)?.kind === "ghosted";
          return (
            <div
              className={`flex w-64 overflow-hidden rounded-md border opacity-95 shadow-xl ${
                olderDaysAgo === undefined
                  ? appGhosted
                    ? "border-ghost/60 bg-ghost/10"
                    : "border-line bg-card"
                  : "border-dashed border-line bg-card saturate-[.6]"
              }`}
              style={{ transform: `rotate(${cardTilt(app.id)}deg)` }}
            >
              <span
                className="w-1.5 shrink-0"
                style={{ backgroundColor: stageMeta[app.stage].color }}
                aria-hidden
              />
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="text-base font-semibold text-ink">{app.company}</p>
                {app.role && <p className="text-sm text-ink-dim">{app.role}</p>}
              </div>
            </div>
          );
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
