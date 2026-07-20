/* Fixed SpecCompass review renderer infrastructure. Review commands only fill JSON review data. */
(function () {
  const FORMAT = "speccompass-confirmation-package";
  const VERSION = 1;
  const REVIEW_TYPES = new Set(["flow", "ui", "outline"]);
  const DEFAULT_MAX_UTF8_BYTES = 100000;
  // Covers final continuation anchors and per-part counters after candidate sizing.
  const PACKING_HEADROOM_BYTES = 1800;

  function utf8Size(value) {
    const text = String(value ?? "");
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).length;
    }
    return unescape(encodeURIComponent(text)).length;
  }

  function packageSize(value) {
    return utf8Size(JSON.stringify(value, null, 2));
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function cleanText(value, fallback = "") {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text || fallback;
  }

  function safeToken(value, fallback = "unknown") {
    return cleanText(value, fallback).replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80) || fallback;
  }

  function isSafeFeatureId(feature) {
    return (
      typeof feature === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(feature) &&
      !feature.includes("..") &&
      !feature.includes("/") &&
      !feature.includes("\\")
    );
  }

  function assertReviewType(reviewType) {
    if (typeof reviewType !== "string" || !REVIEW_TYPES.has(reviewType)) {
      throw new Error("review_type must be one of flow, ui, or outline");
    }
    return reviewType;
  }

  function assertSafeRepoPath(path, fieldName = "target_path") {
    const value = String(path || "").trim().replace(/\\/g, "/");
    if (!value) throw new Error(`${fieldName} is required`);
    if (value.startsWith("/") || /^[A-Za-z]:\//.test(value)) {
      throw new Error(`${fieldName} must be repo-relative`);
    }
    if (value.includes("..") || value.includes("//")) {
      throw new Error(`${fieldName} must not contain .. or empty path segments`);
    }
    return value;
  }

  function assertConfirmationTargetPath(path, reviewType) {
    const value = assertSafeRepoPath(path);
    const targetPatterns = {
      flow: /^specs\/([^/]+)\/flows\/review\/flow-confirmation\.md$/,
      ui: /^specs\/([^/]+)\/ui\/review\/ui-confirmation\.md$/,
      outline: /^specs\/([^/]+)\/prd\/review\/outline-confirmation\.md$/
    };
    const expectedPaths = {
      flow: "specs/<feature>/flows/review/flow-confirmation.md",
      ui: "specs/<feature>/ui/review/ui-confirmation.md",
      outline: "specs/<feature>/prd/review/outline-confirmation.md"
    };
    const normalizedReviewType = assertReviewType(reviewType);
    const match = value.match(targetPatterns[normalizedReviewType]);
    if (!match || !isSafeFeatureId(match[1])) {
      throw new Error(`target_path must point to ${expectedPaths[normalizedReviewType]}`);
    }
    return value;
  }

  function safeWritebackTarget(data = {}) {
    const reviewType = assertReviewType(data.review_type);
    if (data.target_path) {
      return assertConfirmationTargetPath(data.target_path, reviewType);
    }

    const artifactPath = String(data.artifact_path || data.source_review_data || "").trim().replace(/\\/g, "/");
    if (artifactPath) {
      const flowMatch = artifactPath.match(/^specs\/([^/.][^/]*)\/flows\/review\/flow-review-data\.json$/);
      const uiMatch = artifactPath.match(/^specs\/([^/.][^/]*)\/ui\/review\/ui-review-data\.json$/);
      const outlineMatch = artifactPath.match(/^specs\/([^/.][^/]*)\/prd\/review\/outline-review-data\.json$/);
      if (reviewType === "flow" && flowMatch) {
        return assertConfirmationTargetPath(`specs/${flowMatch[1]}/flows/review/flow-confirmation.md`, reviewType);
      }
      if (reviewType === "ui" && uiMatch) {
        return assertConfirmationTargetPath(`specs/${uiMatch[1]}/ui/review/ui-confirmation.md`, reviewType);
      }
      if (reviewType === "outline" && outlineMatch) {
        return assertConfirmationTargetPath(`specs/${outlineMatch[1]}/prd/review/outline-confirmation.md`, reviewType);
      }
    }

    const feature = data.project?.feature;
    if (isSafeFeatureId(feature)) {
      const targetPaths = {
        flow: `specs/${feature}/flows/review/flow-confirmation.md`,
        ui: `specs/${feature}/ui/review/ui-confirmation.md`,
        outline: `specs/${feature}/prd/review/outline-confirmation.md`
      };
      const target = targetPaths[reviewType];
      return assertConfirmationTargetPath(target, reviewType);
    }

    throw new Error("Cannot derive safe confirmation target_path from review data");
  }

  function randomIdPart() {
    const cryptoRef = globalThis.crypto || globalThis.window?.crypto;
    if (cryptoRef?.getRandomValues) {
      const values = new Uint32Array(2);
      cryptoRef.getRandomValues(values);
      return Array.from(values, (value) => value.toString(36)).join("-");
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createPackageSessionId(input = {}) {
    const batch = safeToken(input.batch_id, "batch");
    return `speccompass-${batch}-${randomIdPart()}`;
  }

  function normalizeRecord(record, index, moduleContext = {}) {
    const normalized = cloneValue(record) || {};
    normalized.module_id = cleanText(normalized.module_id, moduleContext.module_id || "module");
    normalized.module_title = cleanText(normalized.module_title, moduleContext.module_title || normalized.module_id);
    normalized.target_ref = cleanText(normalized.target_ref || normalized.id, `record-${index + 1}`);
    normalized.target_label = cleanText(normalized.target_label || normalized.label, normalized.target_ref);
    return normalized;
  }

  function normalizeModule(module, index) {
    const rawContext = module?.module_context || {};
    const moduleId = cleanText(rawContext.module_id || module?.module_id || module?.id, `module-${index + 1}`);
    const moduleTitle = cleanText(rawContext.module_title || module?.module_title || module?.title, moduleId);
    const moduleSummary = cleanText(rawContext.module_summary || module?.module_summary || module?.summary, "未提供模块说明。");
    const status = cleanText(rawContext.status || module?.status, "PENDING");
    const moduleContext = {
      module_id: moduleId,
      module_title: moduleTitle,
      module_summary: moduleSummary,
      status
    };
    return {
      module_id: moduleId,
      module_title: moduleTitle,
      module_summary: moduleSummary,
      status,
      module_context: moduleContext,
      records: (module?.records || []).map((record, recordIndex) => normalizeRecord(record, recordIndex, moduleContext))
    };
  }

  function isUnauthorizedDraftRecord(record) {
    return (
      record?.status === "DRAFT" ||
      record?.bucket === "draft_excluded_items" ||
      record?.authorization_state === "EXCLUDED_DRAFT" ||
      record?.is_authorized_decision === false
    );
  }

  function countUnauthorizedDrafts(modules) {
    return (modules || []).reduce(
      (count, module) => count + (module.records || []).filter(isUnauthorizedDraftRecord).length,
      0
    );
  }

  function countRecords(modules) {
    return (modules || []).reduce((count, module) => count + (module.records || []).length, 0);
  }

  function normalizeOutlineIdentity(input, reviewType, reviewDataId) {
    if (reviewType !== "outline") {
      return { outlineDigest: undefined, sourceAuthorityIds: undefined };
    }
    if (reviewDataId === "N/A") {
      throw new Error("review_data_id is required for outline confirmation packages");
    }
    const outlineDigest = cleanText(input.outline_digest);
    if (!/^[0-9a-f]{64}$/i.test(outlineDigest)) {
      throw new Error("outline_digest must be a 64-character hexadecimal digest");
    }
    if (!Array.isArray(input.source_authority_ids) || input.source_authority_ids.length === 0) {
      throw new Error("source_authority_ids must be a non-empty array for outline confirmation packages");
    }
    const sourceAuthorityIds = input.source_authority_ids.map((value) => cleanText(value));
    if (sourceAuthorityIds.some((value) => !value) || new Set(sourceAuthorityIds).size !== sourceAuthorityIds.length) {
      throw new Error("source_authority_ids must contain unique non-empty strings");
    }
    return { outlineDigest, sourceAuthorityIds };
  }

  function normalizeInput(input = {}, maxBytes = DEFAULT_MAX_UTF8_BYTES) {
    const reviewType = assertReviewType(input.review_type);
    const modules = (input.modules || []).map(normalizeModule);
    const unauthorizedDraftCount = countUnauthorizedDrafts(modules);
    const reviewDataId = cleanText(input.review_data_id, "N/A");
    const { outlineDigest, sourceAuthorityIds } = normalizeOutlineIdentity(input, reviewType, reviewDataId);
    return {
      format: FORMAT,
      version: VERSION,
      schema_version: input.schema_version || VERSION,
      review_type: reviewType,
      package_session_id: cleanText(input.package_session_id, createPackageSessionId(input)),
      batch_id: cleanText(input.batch_id, "N/A"),
      review_data_id: reviewDataId,
      outline_digest: outlineDigest,
      source_authority_ids: sourceAuthorityIds,
      source_review_data: cleanText(input.source_review_data || input.artifact_path, "N/A"),
      target_path: safeWritebackTarget({ ...input, review_type: reviewType }),
      max_utf8_bytes: maxBytes,
      total_record_count: countRecords(modules),
      has_unauthorized_drafts: unauthorizedDraftCount > 0,
      unauthorized_draft_count: unauthorizedDraftCount,
      generated_at: input.generated_at || new Date().toISOString(),
      package_instruction: {
        purpose: "This package records reviewer choices from the SpecCompass review page.",
        writeback_rule: "Write one confirmation Markdown document to target_path. Do not reinterpret the choices, do not summarize away records, and keep revision_requests actionable. If part_count is greater than 1, do not write a single part as the complete confirmation document; collect all parts first, verify summed part_record_count equals total_record_count, merge records by part_index, then write one coherent target_path update.",
        split_rule: "If part_count is greater than 1, collect all parts with the same package_session_id before final writeback, verify the number of files equals part_count, verify each part repeats the same total_record_count, verify the sum of part_record_count equals total_record_count, then process packages in part_index order. continuation_from and continuation_to are boundary anchors only; each part is self-contained, each module segment repeats module_context, and each record repeats module_id/module_title so choices keep their module ownership after splitting.",
        merge_verification: "For multi-part packages, collect exactly part_count files with the same package_session_id, review_type, batch_id, review_data_id, outline_digest, source_authority_ids, source_review_data, and target_path. Verify all parts repeat the same total_record_count and that sum(part_record_count) == total_record_count before writing. If any part is missing, duplicated, from another session, or fails the identity or count checks, stop and ask for the missing/correct package instead of writing target_path.",
        groups_rule: "When groups.summary_only is true, modules[].records is the authoritative review detail and groups only carries counts to avoid repeated oversized summaries. Rebuild revision_requests from records[].revision_request when needed.",
        draft_rule: "Records with status DRAFT, bucket draft_excluded_items, authorization_state EXCLUDED_DRAFT, or is_authorized_decision false must not be written as authorized decisions. They are excluded drafts for follow-up only.",
        authorization_rule: "Browser localStorage is not authorization. The confirmation document at target_path is the authorization artifact.",
        output_template: {
          frontmatter: [
            "schema_version",
            "review_type",
            "batch_id",
            "review_data_id",
            "outline_digest",
            "source_authority_ids",
            "source_review_data",
            "package_session_id",
            "target_path",
            "part_count",
            "total_record_count"
          ],
          sections: [
            "confirmed_items",
            "decision_recorded_items",
            "decision_records",
            "needs_decision_items",
            "unresolved_decision_items",
            "draft_excluded_items",
            "revision_requests"
          ],
          merge_rule: "Build sections from modules[].records after all parts are collected. Authorized records are only records with authorization_state AUTHORIZED. Revision requests come from records[].revision_request and must keep target_ref, target_label, review_type, change_type, selected_option, reviewer_note, expected_model_action, and next_exit."
        }
      },
      groups: cloneValue(input.groups || {}),
      modules
    };
  }

  function compactGroups(groups = {}) {
    const compact = {
      summary_only: true,
      records_authoritative: "modules[].records"
    };
    for (const [key, value] of Object.entries(groups || {})) {
      if (Array.isArray(value)) {
        compact[key] = { count: value.length };
      } else if (value && typeof value === "object") {
        compact[key] = { count: Object.keys(value).length };
      } else {
        compact[key] = value;
      }
    }
    return compact;
  }

  function makePart(base, modules, partIndex, partCount, continuationFrom, continuationTo, splitReason) {
    return {
      format: FORMAT,
      version: VERSION,
      schema_version: base.schema_version,
      review_type: base.review_type,
      package_session_id: base.package_session_id,
      batch_id: base.batch_id,
      review_data_id: base.review_data_id,
      outline_digest: base.outline_digest,
      source_authority_ids: base.source_authority_ids,
      source_review_data: base.source_review_data,
      target_path: base.target_path,
      max_utf8_bytes: base.max_utf8_bytes,
      total_record_count: base.total_record_count,
      part_record_count: countRecords(modules),
      has_unauthorized_drafts: base.has_unauthorized_drafts,
      unauthorized_draft_count: base.unauthorized_draft_count,
      part_index: partIndex,
      part_count: partCount,
      continuation_from: continuationFrom,
      continuation_to: continuationTo,
      split_reason: splitReason,
      generated_at: base.generated_at,
      package_instruction: base.package_instruction,
      package_warning: base.has_unauthorized_drafts
        ? `${base.unauthorized_draft_count} DRAFT record(s) are excluded from authorization.`
        : undefined,
      groups: base.groups,
      modules
    };
  }

  function segmentEndToken(modules) {
    const lastModule = modules[modules.length - 1];
    const records = lastModule?.records || [];
    const lastRecord = records[records.length - 1];
    const moduleId = truncateString(lastModule?.module_context?.module_id || lastModule?.module_id || "module", 120);
    const recordRef = truncateString(lastRecord?.target_ref || "module-end", 160);
    return `after:${moduleId}:${recordRef}`;
  }

  function candidateFits(base, modules, maxBytes) {
    const test = makePart(
      base,
      modules,
      999,
      999,
      "continuation-placeholder",
      "continuation-placeholder",
      "size_limit_100k_utf8"
    );
    return packageSize(test) <= Math.max(1, maxBytes - PACKING_HEADROOM_BYTES);
  }

  function truncateString(value, maxChars) {
    const text = String(value ?? "");
    if (text.length <= maxChars) return text;
    return `${text.slice(0, Math.max(0, maxChars - 70))}...[TRUNCATED_BY_CONFIRMATION_PACKAGE: original_chars=${text.length}]`;
  }

  function compactRecordForLimit(record, base, moduleTemplate, maxBytes) {
    let compact = cloneValue(record) || {};
    compact.package_warning = "This single record was too large for a 100000 UTF-8 byte package and long text fields were compacted. Use source_review_data and target_ref if full original text is needed.";
    let maxChars = 6000;
    while (maxChars >= 400) {
      compact = truncateLongStrings(compact, maxChars);
      const candidateModule = { ...moduleTemplate, records: [compact] };
      if (candidateFits(base, [candidateModule], maxBytes)) {
        return compact;
      }
      maxChars = Math.floor(maxChars * 0.55);
    }
    return {
      target_ref: truncateString(record.target_ref || "oversize-record", 240),
      target_label: truncateString(record.target_label || record.target_ref || "oversize-record", 360),
      selected_option: truncateString(record.selected_option || "MISSING", 80),
      status: truncateString(record.status || "MISSING", 80),
      next_exit: truncateString(record.next_exit || "", 160),
      change_type: truncateString(record.change_type || "", 120),
      bucket: truncateString(record.bucket || "", 120),
      authorization_state: truncateString(record.authorization_state || "", 120),
      is_authorized_decision: record.is_authorized_decision === false ? false : Boolean(record.is_authorized_decision),
      reviewer_note: truncateString(record.reviewer_note || record.note || "", 1200),
      revision_request: record.revision_request ? truncateLongStrings(record.revision_request, 1200) : null,
      package_warning: compact.package_warning
    };
  }

  function truncateLongStrings(value, maxChars) {
    if (typeof value === "string") return truncateString(value, maxChars);
    if (Array.isArray(value)) return value.map((entry) => truncateLongStrings(entry, maxChars));
    if (value && typeof value === "object") {
      const output = {};
      for (const [key, entry] of Object.entries(value)) {
        output[key] = truncateLongStrings(entry, maxChars);
      }
      return output;
    }
    return value;
  }

  function splitLargeModule(base, module, maxBytes) {
    const segments = [];
    let currentRecords = [];
    const moduleWithoutRecords = { ...module, records: [] };

    for (const record of module.records || []) {
      const candidateModule = { ...moduleWithoutRecords, records: [...currentRecords, record] };
      if (candidateFits(base, [candidateModule], maxBytes)) {
        currentRecords.push(record);
        continue;
      }

      if (currentRecords.length) {
        segments.push([{ ...moduleWithoutRecords, records: currentRecords }]);
        currentRecords = [];
      }

      const singleModule = { ...moduleWithoutRecords, records: [record] };
      if (candidateFits(base, [singleModule], maxBytes)) {
        currentRecords.push(record);
      } else {
        const compactRecord = compactRecordForLimit(record, base, moduleWithoutRecords, maxBytes);
        segments.push([{ ...moduleWithoutRecords, records: [compactRecord] }]);
      }
    }

    if (currentRecords.length) {
      segments.push([{ ...moduleWithoutRecords, records: currentRecords }]);
    }
    if (!segments.length) {
      segments.push([{ ...moduleWithoutRecords, records: [] }]);
    }
    return segments;
  }

  function buildSegments(base, maxBytes) {
    const segments = [];
    let currentModules = [];

    for (const module of base.modules || []) {
      const withModule = [...currentModules, module];
      if (candidateFits(base, withModule, maxBytes)) {
        currentModules = withModule;
        continue;
      }

      if (currentModules.length) {
        segments.push(currentModules);
        currentModules = [];
      }

      if (candidateFits(base, [module], maxBytes)) {
        currentModules = [module];
      } else {
        segments.push(...splitLargeModule(base, module, maxBytes));
      }
    }

    if (currentModules.length) {
      segments.push(currentModules);
    }
    return segments.length ? segments : [[]];
  }

  function splitConfirmationPackage(input, maxBytes = DEFAULT_MAX_UTF8_BYTES) {
    const normalizedMaxBytes = Number.isFinite(Number(maxBytes)) && Number(maxBytes) > 0
      ? Math.floor(Number(maxBytes))
      : DEFAULT_MAX_UTF8_BYTES;
    const base = normalizeInput(input, normalizedMaxBytes);
    const allInOne = makePart(base, base.modules, 1, 1, "START", "END", "none");
    if (packageSize(allInOne) <= normalizedMaxBytes) {
      return [allInOne];
    }

    const splitBase = { ...base, groups: compactGroups(base.groups) };
    const segments = buildSegments(splitBase, normalizedMaxBytes);
    const partCount = segments.length;
    const parts = segments.map((modules, index) => {
      const continuationFrom = index === 0 ? "START" : segmentEndToken(segments[index - 1]);
      const continuationTo = index === partCount - 1 ? "END" : segmentEndToken(modules);
      return makePart(
        splitBase,
        modules,
        index + 1,
        partCount,
        continuationFrom,
        continuationTo,
        "size_limit_100k_utf8"
      );
    });

    for (const part of parts) {
      if (packageSize(part) > normalizedMaxBytes) {
        throw new Error(`confirmation package part ${part.part_index} exceeds ${normalizedMaxBytes} UTF-8 bytes`);
      }
    }
    return parts;
  }

  function packageFilename(part) {
    const type = safeToken(part.review_type, "review");
    const batch = safeToken(part.batch_id, "batch");
    if (part.part_count > 1) {
      return `${type}-confirmation-package-${batch}-part-${part.part_index}-of-${part.part_count}.json`;
    }
    return `${type}-confirmation-package-${batch}.json`;
  }

  function downloadJson(part, delayMs = 0) {
    if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
      throw new Error("download requires a browser environment");
    }
    const run = () => {
      const blob = new Blob([JSON.stringify(part, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = packageFilename(part);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    };
    if (delayMs > 0) {
      window.setTimeout(run, delayMs);
    } else {
      run();
    }
  }

  function downloadConfirmationPackage(input, options = {}) {
    const maxBytes = options.maxBytes || DEFAULT_MAX_UTF8_BYTES;
    const parts = splitConfirmationPackage(input, maxBytes);
    parts.forEach((part, index) => downloadJson(part, index * 250));
    return {
      parts,
      part_count: parts.length,
      filenames: parts.map(packageFilename),
      max_utf8_bytes: maxBytes
    };
  }

  window.SpecCompassConfirmationPackage = {
    FORMAT,
    VERSION,
    DEFAULT_MAX_UTF8_BYTES,
    utf8Size,
    packageSize,
    safeWritebackTarget,
    splitConfirmationPackage,
    downloadConfirmationPackage,
    packageFilename
  };
})();
