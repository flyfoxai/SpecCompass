/* Outline discovery exports intent deltas only. It never creates authorization evidence. */
(function () {
  const FORMAT = "speccompass-outline-discovery-response";
  const OPERATIONS = new Set(["confirm_candidate", "add", "replace", "exclude", "context_note"]);

  function cleanText(value, fallback = "") {
    return String(value ?? fallback).replace(/\s+/g, " ").trim() || fallback;
  }

  function safeToken(value, fallback) {
    return cleanText(value).replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80) || fallback;
  }

  function randomPart() {
    const cryptoRef = globalThis.crypto || globalThis.window?.crypto;
    if (cryptoRef?.getRandomValues) {
      const values = new Uint32Array(2);
      cryptoRef.getRandomValues(values);
      return Array.from(values, (value) => value.toString(36)).join("-");
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function questionIndex(reviewData) {
    const result = new Map();
    for (const group of reviewData.question_groups || []) {
      for (const question of group.questions || []) {
        if (!question?.id || result.has(question.id)) {
          throw new Error(`question_id must be unique and non-empty: ${question?.id || "missing"}`);
        }
        result.set(question.id, question);
      }
    }
    return result;
  }

  function validateReviewData(reviewData) {
    if (!reviewData || reviewData.review_type !== "outline_discovery") {
      throw new Error("review_data.review_type must be outline_discovery");
    }
    if (reviewData.interaction_mode !== "discovery") {
      throw new Error("outline_discovery interaction_mode must be discovery");
    }
    if (reviewData.schema_version !== 2) {
      throw new Error("outline_discovery schema_version must be 2");
    }
    if (!new Set(["explore", "frame"]).has(reviewData.outline_maturity)) {
      throw new Error("outline_discovery outline_maturity must be explore or frame");
    }
    if (reviewData.authorization_effect !== "none" || reviewData.next_route !== "/sp.prd") {
      throw new Error("outline_discovery must be non-authorizing and return to /sp.prd");
    }
  }

  function normalizeResponse(response, question, index, responseId) {
    const outlineNodeId = cleanText(question.outline_node_id);
    if (!outlineNodeId) throw new Error(`outline_node_id is required for question_id ${question.id}`);
    const suppliedNodeId = cleanText(response?.outline_node_id);
    if (suppliedNodeId && suppliedNodeId !== outlineNodeId) {
      throw new Error(`outline_node_id does not match question_id ${question.id}`);
    }
    const operation = cleanText(response?.operation);
    if (!OPERATIONS.has(operation)) throw new Error(`unsupported discovery operation: ${operation || "missing"}`);
    if (!(question.free_input?.allowed_operations || []).includes(operation)) {
      throw new Error(`operation is not allowed for question_id ${question.id}: ${operation}`);
    }

    const candidateId = cleanText(response?.candidate_id) || null;
    const candidate = candidateId
      ? (question.candidates || []).find((entry) => entry.id === candidateId)
      : null;
    if (candidateId && !candidate) throw new Error(`candidate_id is unknown for question_id ${question.id}: ${candidateId}`);
    if (operation === "confirm_candidate" && !candidate) {
      throw new Error(`candidate_id is required for confirm_candidate on question_id ${question.id}`);
    }

    const noneOfTheAbove = response?.none_of_the_above === true;
    if (noneOfTheAbove && question.allow_none_of_the_above !== true) {
      throw new Error(`none_of_the_above is not allowed for question_id ${question.id}`);
    }
    const targetId = cleanText(response?.target_id) || null;
    const userValue = cleanText(response?.value);
    let value = userValue;

    if (operation === "confirm_candidate") {
      if (!candidate || targetId || userValue || noneOfTheAbove) {
        throw new Error(`operation confirm_candidate requires one candidate and forbids target, direct input, and none-of-the-above on question_id ${question.id}`);
      }
      value = cleanText(candidate.value);
    } else if (operation === "add") {
      if (candidateId || targetId || !userValue) {
        throw new Error(`operation add requires direct input and forbids candidate and target on question_id ${question.id}`);
      }
    } else if (operation === "context_note") {
      if (candidateId || targetId || !userValue || noneOfTheAbove) {
        throw new Error(`operation context_note requires direct input and forbids candidate, target, and none-of-the-above on question_id ${question.id}`);
      }
    } else if (operation === "replace") {
      if (candidateId || !targetId || !userValue || noneOfTheAbove) {
        throw new Error(`operation replace requires one target and direct input, and forbids candidate and none-of-the-above on question_id ${question.id}`);
      }
    } else if (operation === "exclude") {
      if (Boolean(candidateId) === Boolean(targetId) || noneOfTheAbove) {
        throw new Error(`operation exclude requires exactly one candidate or target and forbids none-of-the-above on question_id ${question.id}`);
      }
    }

    return {
      delta_id: `${responseId}-delta-${String(index + 1).padStart(3, "0")}`,
      question_id: question.id,
      outline_node_id: outlineNodeId,
      target_kind: cleanText(question.target_kind, "context"),
      operation,
      candidate_id: candidateId,
      target_id: targetId,
      value,
      source_tag: operation === "confirm_candidate" ? "user-confirmed" : "user",
      none_of_the_above: noneOfTheAbove,
      supersedes_delta_id: null
    };
  }

  function buildDiscoveryResponse(input = {}) {
    const reviewData = input.review_data;
    validateReviewData(reviewData);
    if (!Array.isArray(input.responses)) throw new Error("responses must be an array");
    if (input.responses.length === 0) throw new Error("responses must contain at least one discovery response");
    const questions = questionIndex(reviewData);
    const responseId = cleanText(input.response_id) || `discovery-${safeToken(reviewData.batch_id, "batch")}-${randomPart()}`;
    const seenQuestions = new Set();
    const deltas = input.responses.map((response, index) => {
      const questionId = cleanText(response?.question_id);
      const question = questions.get(questionId);
      if (!question) throw new Error(`question_id is unknown: ${questionId || "missing"}`);
      if (seenQuestions.has(questionId)) throw new Error(`question_id occurs more than once: ${questionId}`);
      seenQuestions.add(questionId);
      return normalizeResponse(response, question, index, responseId);
    });

    return {
      schema_version: 2,
      format: FORMAT,
      response_id: responseId,
      review_type: "outline_discovery",
      batch_id: cleanText(reviewData.batch_id),
      feature: cleanText(reviewData.project?.feature),
      outline_maturity: reviewData.outline_maturity,
      source_review_data: cleanText(reviewData.artifact_path),
      authorization_effect: "none",
      next_route: "/sp.prd",
      generated_at: input.generated_at || new Date().toISOString(),
      deltas
    };
  }

  function downloadDiscoveryResponse(input = {}) {
    const response = buildDiscoveryResponse(input);
    const blob = new Blob([`${JSON.stringify(response, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const feature = safeToken(response.feature, "feature");
    anchor.href = url;
    anchor.download = `outline-discovery-response-${feature}-${safeToken(response.response_id, "response")}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return { response, filename: anchor.download };
  }

  window.SpecCompassDiscoveryResponsePackage = {
    buildDiscoveryResponse,
    downloadDiscoveryResponse
  };
})();
