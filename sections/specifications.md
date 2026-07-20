# Specifications

This section provides the specification for the protocols and interfaces to be used and the expected behaviour of the components.

<p class="note" title="Information model independence">
The fields defined in this section form an information model for an authorization-decision [=log record=]. The model is independent of any particular telemetry framework; conformant records can be emitted via any transport, provided the record carries the fields specified here. The model is intentionally compatible in shape with [[?OpenTelemetry]], so that organisations already operating an OpenTelemetry pipeline can carry [=log records=] on existing infrastructure without conversion.
</p>

## Protocols

This standard prescribes the shape of the messages exchanged between the [=PDP=] and the [=log=] (see [[[#Interface]]]), but not the transport that carries them. Components MUST comply with the message interface; the choice of REST, gRPC, messaging, file ingestion, or any other delivery mechanism is left to the implementer.

It is RECOMMENDED to use the OpenTelemetry Protocol [[?OTLP]] for the interaction between the Application and the log.

When using HTTP-based protocols (e.g., HTTP/1.1 [[RFC9112]] or HTTP/2 [[RFC9113]]), implementations MUST use the [[[trace-context]]] HTTP header format (`traceparent`, `tracestate`) for propagation.

For non-HTTP protocols (e.g., gRPC, messaging systems), implementations MUST provide equivalent [=trace context=] propagation semantics, preserving `trace_id`, `span_id`, and parent relationships across boundaries. Where the protocol has no formally standardised [[trace-context]] binding, OpenTelemetry context propagation or another widely adopted convention with equivalent semantics is sufficient.

## Behaviour

### Encryption

The [=log=] MUST enforce TLS on connections, in accordance with the standard practice established within the organisation.

### Tracing

All components participating in the evaluation of [=authorization decisions=] (including [=PEPs=], [=PDPs=], [=PAPs=], and [=PIPs=]) MUST propagate [=trace context=] as defined by [[[trace-context]]], and MUST preserve [=trace=] continuity across component boundaries.

The same rule applies on every request-scoped hop in the evaluation of an [=authorization decision=], whether the sender is a [=PEP=] calling a [=PDP=], a [=PDP=] calling a [=PIP=] or [=PAP=], or any other component:

- On receiving an incoming request, the component MUST create a [=span=] as a child of the [=span=] identified by the incoming `traceparent`, or — if no [=trace context=] is present — start a new [=trace=] with a root [=span=].
- Before making an outgoing request, the component MUST start a new child [=span=] representing that outgoing operation. The outgoing `traceparent` carries the active [`trace_id`](#trace_id) and the `span_id` of this new outgoing [=span=] as the `parent-id` from the receiver's perspective, as defined by [[[trace-context]]].

<p class="note" title="The W3C Trace Context parent-id field">
[[[trace-context]]] names the field <code>parent-id</code> because the field's value, from the next hop's perspective, identifies the parent of any [=span=] the next hop creates; from the sender's perspective it is the sender's own <code>span_id</code> for the outgoing [=span=].
</p>

This ensures that every [=span=] correctly identifies its immediate parent, and that [=authorization decisions=] are consistently correlated with the broader transaction or request lifecycle in which they occur.

When a [=trace context=] is received from another organisation, the receiving component MUST preserve the `trace_id` unchanged in every [=log record=] and outgoing [=trace context=] originating from the resulting [=authorization decision=] flow. A new `trace_id` MUST NOT be allocated within an in-progress [=authorization decision=] flow.

Logging of [=authorization decisions=] is independent of the `sampled` bit in `traceparent`: that bit governs telemetry sampling only, and [=log records=] are accountability records that MUST be produced regardless. ADL emitters MUST NOT modify the `sampled` flag.

When propagating, components MUST follow the propagation rules in <a data-cite="trace-context#mutating-the-tracestate-field">section 3.5 (Mutating the `tracestate` Field)</a> of [[trace-context]] — in particular, if a component does not modify `traceparent`, it MUST NOT modify `tracestate`.

<figure>
    <div class="mermaid" data-figure-name="decision-trace.mermaid"></div>
    <figcaption>Trace and spans during the evaluation of an authorization decision</figcaption>
</figure>

<p class="note" title="Pro-active interactions are outside the trace">
Pro-active interactions — for example, a [=PAP=] distributing [=policies=] to a [=PDP=], or a [=PIP=] pre-populating data into a [=PDP=] — happen outside the scope of any individual [=authorization decision=] and are not part of its [=trace=]. They are independent operations with their own lifecycle and, where applicable, their own [=traces=]. The [=policies=] and information delivered through these pro-active interactions are the same content that subsequent [=log records=] reference via <a href="#adl-core-policies"><code>adl.core.policies</code></a> and <a href="#adl-core-information"><code>adl.core.information</code></a> [=source=] references when an [=authorization decision=] is evaluated.
</p>

### Generation

Each [=authorization decision=] evaluated by a [=PDP=] — whether the [=PDP=] completed its evaluation (`status` of `Unset` or `Ok`, with the decision carried in `body.adl.core.response`) or could not complete it (`status` of `Error`) — MUST produce exactly one [=log record=] persisted to durable storage.

A single API call to the [=PDP=] results in exactly one [=log record=], regardless of whether the call is to the Access Evaluation API (one decision) or the Access Evaluations API (multiple decisions in a single call). Per-sub-decision outcomes are carried in `body.adl.core.response`.

<p class="note" title="Use of Access Evaluations">
The [[AuthZEN]] Access Evaluations API is well-suited to prospective enumeration (e.g. determining which UI elements to enable for a user) and to compound checks where multiple permissions together correspond to a single user action. In both cases the call has a 1:1 correspondence to that user action and to the resulting [=log record=], and cross-request correlation is preserved. <br/><br/>
This standard RECOMMENDS against using Access Evaluations as a batching mechanism for otherwise independent decisions, because the single resulting [=log record=] cannot uniquely correlate to per-decision records in downstream logs (such as [[LDV]]). Implementations that nevertheless use it that way are responsible for ensuring that those downstream records can still be joined to the corresponding sub-decision.
</p>

<p class="note" title="Cached decisions">
Caching [=authorization decisions=] is discouraged. A cached decision references the [=policies=] and information that were current at cache population; [=replaying=] it against the current state may yield a different outcome, and per-cache-use logging — required to preserve accountability — erodes much of the performance benefit caching is intended to provide. <br/><br/>
If a cached decision is nevertheless applied to a new request, that application SHOULD produce its own [=log record=], carrying the `trace_id` and `parent_span_id` of the new request with a freshly allocated `span_id`. The `trace_id` of the original cache-population request MUST NOT be reused. The `attributes.adl.core.policies` and `attributes.adl.core.information` [=source=] references in the new [=log record=] point to the same [=sources=] used by the original decision.
</p>

### Ingestion

Ingestion of [=log records=] into the [=Authorization Decision Log=] MUST be idempotent: re-submitting the same [=log record=] — for example as a result of a queue redelivery in the write-ahead log pattern described in [[[#architecture]]] — MUST NOT produce a duplicate persisted record. The idempotency key is implementation-defined; common choices are the pair `(trace_id, span_id)` or a content-hash of the [=log record=].

## Interface {#Interface}

A [=log record=] MUST contain the following mandatory fields and MAY contain the optional fields:

| Field | Type | Mandatory? |
| --- | --- | --- |
| [`trace_id`](#trace_id) | 16 byte | mandatory |
| [`span_id`](#span_id) | 8 byte | mandatory |
| [`parent_span_id`](#parent_span_id) | 8 byte | conditional |
| [`event_name`](#event_name) | string | mandatory |
| [`timestamp`](#timestamp) | uint64 | mandatory |
| [`status`](#status) | enum | mandatory |
| [`attributes`](#attributes) | object | optional |
| [`resource`](#resource) | object | optional |
| [`body`](#body) | object | optional |

### `trace_id`

Unique identifier of the [=trace=] that this [=authorization decision=] belongs to.

When serialised in textual form (e.g., JSON), `trace_id` MUST be encoded as 32 lowercase hexadecimal characters, matching the form used in the `traceparent` header defined by [[trace-context]].

`trace_id` values MUST be generated using a cryptographically secure random number generator and MUST NOT be derived from user-identifiable input, in line with <a data-cite="trace-context#privacy-considerations">section 6 (Privacy Considerations)</a> of [[trace-context]].

### `span_id`

Unique identifier of the [=span=] representing this [=authorization decision=].

When serialised in textual form (e.g., JSON), `span_id` MUST be encoded as 16 lowercase hexadecimal characters, matching the form used in the `traceparent` header defined by [[trace-context]].

`span_id` values MUST be generated using a cryptographically secure random number generator and MUST NOT be derived from user-identifiable input, in line with <a data-cite="trace-context#privacy-considerations">section 6 (Privacy Considerations)</a> of [[trace-context]].

### `parent_span_id`

Unique identifier of the [=span=] of which this [=log record=]'s [=span=] is a child.

`parent_span_id` MUST be set to the `parent-id` of the incoming `traceparent` when one is present. It MAY be omitted only when the [=authorization decision=] flow has no upstream caller — that is, when the [=log record=]'s [=span=] is the root of the [=trace=].

### `event_name`

The `event_name` field identifies the type of [=authorization decision=] the [=log record=] represents. The five conformant values, each corresponding to one of the [[AuthZEN]] APIs and its information model, are:

| AuthZEN API | `event_name` |
| --- | --- |
| <a data-cite="AuthZEN#section-6">Access Evaluation API</a> | `adl.access_evaluation` |
| <a data-cite="AuthZEN#section-7">Access Evaluations API</a> | `adl.access_evaluations` |
| <a data-cite="AuthZEN#section-8.4">Subject Search API</a> | `adl.search_subject` |
| <a data-cite="AuthZEN#section-8.6">Action Search API</a> | `adl.search_action` |
| <a data-cite="AuthZEN#section-8.5">Resource Search API</a> | `adl.search_resource` |

The `adl.` prefix avoids collisions with other events in the same backend and allows [=log records=] to be filtered or indexed by themselves.

<p class="note" title="Decisions not delivered via the AuthZEN API">
Implementations that do not deliver decisions through the [[AuthZEN]] HTTP API select the `event_name` whose [[AuthZEN]] information model is most closely aligned with the shape of the decision. This applies to in-application authorization checks, XACML [=PDPs=], and OPA-style direct calls. Decisions whose shape does not correspond to any of the five `event_name` values are out of scope of this standard.
</p>

### `timestamp`

The `timestamp` field represents the exact point in time when the [=authorization decision=] was made. The timestamp MUST be encoded as the number of milliseconds since the Unix epoch (`1970-01-01T00:00:00Z`), as an unsigned 64-bit integer.

### `status`

The `status` field describes the outcome of the [=PDP=]'s evaluation attempt. It MUST be one of the following values:

- `Unset` — the default value. The [=PDP=] completed its evaluation without internal error. The response itself — in [[AuthZEN]] format, e.g. a `decision` boolean for the Evaluation APIs or a `results` array for the Search APIs — is carried in `body.adl.core.response`.
- `Ok` — optional. Used when an implementation explicitly marks a successfully completed evaluation. Functionally equivalent to `Unset`.
- `Error` — the [=PDP=] could not produce a decision (for example, engine fault, missing attributes, downstream timeout).

A successful evaluation that resulted in denial (for example, `decision: false` from the Access Evaluation API, or an empty `results` array from a Search API) MUST NOT be reported as `Error`. The `Error` value is reserved for failures of the [=PDP=] itself to evaluate the request — denial is a valid outcome of evaluation and is therefore `Unset` (or `Ok`).

### `attributes`

The `attributes` object contains [=source=] references and metadata for the [=authorization decision=]. It MAY be omitted when no [=source=] references or metadata are recorded.

Each `adl.core.*` entry in `attributes` MUST be a [=source=] reference: a value sufficient to retrieve the referenced data. Raw payloads MUST NOT be inlined in `attributes`; they belong in [`body`](#body). The patterns in [[[#source-references]]] illustrate common forms of [=source=] references. The retention obligation that follows from this — keeping the upstream [=source=] available for as long as the [=log record=] references it — is treated in [Data Retention](#data-retention).

The following `adl.*` attributes are defined by this specification. The five conditional attributes are present when the corresponding aspect of the [=authorization decision=] is to be made retrievable.

| Attribute | Type | Mandatory? |
| --- | --- | --- |
| [`adl.core.request`](#adl-core-request) | object | conditional |
| [`adl.core.response`](#adl-core-response) | object | conditional |
| [`adl.core.policies`](#adl-core-policies) | object | conditional |
| [`adl.core.information`](#adl-core-information) | object | conditional |
| [`adl.core.configuration`](#adl-core-configuration) | object | conditional |
| [`adl.fsc.transaction_id`](#adl-fsc-transaction_id) | string | conditional |

When an `adl.core.*` field is recorded in the [=log record=], the data MUST be carried in exactly one of two locations:

- as raw data in [`body`](#body), or
- via a [=source=] reference in `attributes`.

A field MUST NOT appear in both `body` and `attributes`. Implementations choose one location per field per record.

Implementations MAY include additional attribute keys outside the `adl.*` namespace. Such keys SHOULD follow lowercase, dot-separated, namespaced convention (`<vendor>.<area>.<name>`). A consumer that does not recognise an attribute key MUST ignore it without error.

#### `adl.core.request` {#adl-core-request}

The `adl.core.request` attribute is a [=source=] reference to the input of the decision when the raw request is not carried in [`body`](#body). The reference SHOULD resolve to the request in [[AuthZEN]] format, unless privacy considerations require portions to be omitted.

#### `adl.core.response` {#adl-core-response}

The `adl.core.response` attribute is a [=source=] reference to the output of the decision when the raw response is not carried in [`body`](#body). The reference SHOULD resolve to the response in [[AuthZEN]] format, unless privacy considerations require portions to be omitted.

The response MUST be retrievable when [`status`](#status) is `Unset` or `Ok` and MAY be omitted when [`status`](#status) is `Error`.

<p class="note" title="Search responses and data minimisation">
Responses to the Search APIs — in particular `adl.search_subject` and `adl.search_resource` — typically enumerate sets of subjects or resources for which a permission applies. Logging these enumerations in full can itself constitute a privacy exposure beyond the original request. Implementers SHOULD pay particular attention to <a href="#data-minimisation">data minimisation</a> when logging Search API responses.
</p>

#### `adl.core.policies` {#adl-core-policies}

The `adl.core.policies` attribute references the [=policies=] that the [=PDP=] used to evaluate the request. In a [=PxP=] architecture, this represents the information that would come from the [=PAP=].

A [=PDP=] can have one or more [=sources=] of [=policies=] which can be individually versioned. To accommodate that, `adl.core.policies` is an object in which each key identifies a specific policy [=source=].

All policy [=sources=] that affected the decision SHOULD be referenced. Each value MUST be a [=source=] reference (see [[[#source-references]]]) sufficient to retrieve the [=policies=] from that [=source=].

<aside class="example">
A reference value could be:

- A timestamp
- A unique identifier
- A semantic version
- A Git hash

</aside>

#### `adl.core.information` {#adl-core-information}

The `adl.core.information` attribute references the supporting information used in evaluating the access decision. In a [=PxP=] architecture, this represents the information that would come from [=PIPs=].

It is an object in which each key identifies an information [=source=]. All information [=sources=] that affected the decision SHOULD be referenced. Each value MUST be a [=source=] reference (see [[[#source-references]]]) sufficient to retrieve the information.

#### `adl.core.configuration` {#adl-core-configuration}

The `adl.core.configuration` attribute references the configuration required to [=reconstruct=] the software environment that evaluated the original decision. In a [=PxP=] architecture, this primarily represents the configuration of the [=PDP=], but MAY also include configuration of [=PIPs=] and [=PAPs=].

It is an object in which each key identifies a configuration [=source=]. All configuration [=sources=] that affected the decision SHOULD be referenced. Each value MUST be a [=source=] reference (see [[[#source-references]]]) sufficient to retrieve the configuration.

A high-confidence [=replay=] claim typically requires capturing all of the following: the engine identifier and version (for example, a container digest), the runtime configuration of the engine, the configuration of every [=PIP=] and [=PAP=] that contributed to the decision, and any external sources (for example time, randomness) on which the decision depended.

<aside class="example">
A configuration [=source=] could reference:

- The configuration of the policy engine ([=PDP=])
- The version of the policy language
- The identifier or hostname of the [=PDP=] in case multiple [=PDPs=] are used
- The configuration of [=PIPs=], such as API endpoints
- The Git hash of an IaaS definition, such as a Terraform repository

</aside>

#### `adl.fsc.transaction_id` {#adl-fsc-transaction_id}

Unique identifier of the FSC transaction this request belongs to. This attribute MUST be set when the corresponding request crosses an FSC inway or outway and is therefore expected to be present in [[FSC-Logging]]; it MUST NOT be set otherwise.

<div class="note">

The [=Authorization Decision Log=] and the FSC Log have the same granularity and can thus be combined into a single physical [=log=]. This specification ensures that no fields are defined that conflict with those defined in [[FSC-Logging]].

</div>

### `body`

The `body` field carries the raw `adl.core.*` payloads. It is an object that MAY contain any of the following keys:

- `adl.core.request` - full request in [[AuthZEN]] format
- `adl.core.response` - full response in [[AuthZEN]] format
- `adl.core.policies` - full policies that affected the decision
- `adl.core.information` - full information that affected the decision
- `adl.core.configuration` - full configuration that affected the decision

The shape of `body.adl.core.policies`, `body.adl.core.information` and `body.adl.core.configuration` mirrors the shape of the corresponding [`attributes.adl.core.*`](#attributes) reference: an object keyed by [=source=] name, with the raw payload as the value in place of the [=source=] reference.

A `body` MAY contain any subset of these keys, and MAY be omitted entirely.

### `resource`

The `resource` field identifies the producer of the [=log record=]: the system, application, or environment in which the [=PDP=] evaluated the [=authorization decision=]. It is an open object of key/value attribute pairs.

The vocabulary of `resource` keys is intentionally not prescribed by this standard. Organisations select keys appropriate to their operational practice — for example a service identifier, an environment label, or a controller identifier — and document the chosen vocabulary in their logging policy.

When [=log records=] are aggregated outside the producing organisation, the producing organisation MUST set `resource` such that records can be unambiguously attributed to their producer.

## Span attributes

The [=log record=] interface defined in [[[#Interface]]] does not require OpenTelemetry; it may be emitted via any transport. When ADL *is* implemented on an OpenTelemetry pipeline, however, the same [=PDP=] evaluation is typically also represented by a [=span=]. The [=span=] and the [=log record=] describe the same operation and are correlated via the shared `trace_id` and `span_id`. To let observability tooling and the [=Authorization Decision Log=] navigate to each other:

- The [=span=]'s `name` SHOULD equal the [=log record=]'s [`event_name`](#event_name) (e.g. `adl.access_evaluation`), so [=authorization decisions=] can be identified in tracing tools without joining to the [=log record=].
- Implementations MAY additionally mirror selected `adl.core.*` attributes from the [=log record=] onto the [=span=]'s attributes (for example, the [`adl.core.policies`](#adl-core-policies) reference), to enable filtering of decisions in tracing tools.

## Sources and referencing {#source-references}

A <dfn data-lt="source reference|source references">source reference</dfn> is a compact value that identifies a [=source=]. A [=source reference=] MUST be sufficient to retrieve, on demand, the data from that [=source=] that affected the [=authorization decision=]; this lets a [=log record=] omit the raw payload from [`body`](#body) without loss of accountability.

The patterns described below illustrate common reference formats. Implementations are free to use any other format with these properties.

<section class="informative">

### Versioned sources

Some [=sources=] offer the ability to 'time-travel' by providing a version at which to query. In such cases, the data itself may be omitted and the version can be stored instead.

The version identifier can be a simple value, such as a string or number, or a complex object, such as an array or object containing multiple version identifiers.

The following example shows a reference to a specific semantic version of a policy [=source=].

<aside class="example" title="Policy source reference using semantic versioning">

```json
{
    "traffic-policy": "gmb-2025-94604@1.1.0"
}
```

</aside>

In a complex case, such as limiting requests for open data per IP per minute across a large number of servers, the version could also consist of an array of partition offsets in a Kafka stream of HTTP requests.

<aside class="example" title="Complex versioned information sources using Kafka partition offsets">

```json
{
    "nginx-requests": [ 8376912, 8368118, 8377785, 8386285, 8383526 ]
}
```

</aside>

<p class="note" title="Coordinating retention of versioned sources">
Organisations relying on Versioned [=source=] references MUST coordinate the retention of the upstream [=source=] with the retention of the [=log records=] that reference it, and MUST document this coordination in their logging policy. Reference targets that have become unavailable invalidate the accountability claim of the referencing [=log record=].
</p>

</section>

<section class="informative">

### Temporal sources

In case a [=source=] offers the ability to 'time-travel' by providing a timestamp at which to query, then the data itself may be omitted.

It is RECOMMENDED to use the timestamp defined in the `time` field in the `context` of the `request` as the base time. In that case the [=source=] MAY be omitted fully.

If a different timestamp is used, then it SHOULD be included in [[RFC3339]] format.

<p class="note" title="Inter-system clock inconsistencies">
When system clocks are not aligned properly, a system may be asked to provide data for a timestamp that lies in the future. This can be mitigated by requesting data of a few seconds or minutes ago at the expense of reducing the speed with which changes can be deployed. The risk of inter-system clock inconsistency can be reduced further by synchronising all participating systems to a trusted time source (for example NTP or PTP); see <a href="#information-management">Information management</a> for related guidance.
</p>

<p class="note" title="Usage of REST API Design Rules">
In the context of REST APIs developed by the Dutch government the <a href="https://docs.geostandaarden.nl/api/API-Strategie-ext/#temporal">Temporal extension</a> of the [[?ADR]] can be used for this purpose.
</p>

</section>

<section class="informative">

### Logged sources

For [=sources=] that are logged in an external [=log=], a request identifier is needed to look up the corresponding entry in the external [=log=].

It is RECOMMENDED to use the `trace_id` and `span_id` carried by [[trace-context]] as the request identifier. The referenced request SHOULD have the same `trace_id` as the [=log record=], in which case the [=source=] reference can consist of only the value of the `span_id`.

It is RECOMMENDED to log requests in the [[?WARC]] format as it includes all request and response headers that may be used in the [=authorization decision=].

<p class="note" title="Where the logged source lives">
The external [=log=] referenced from a Logged [=source=] is typically the producing organisation's own record of the call (for example, the WARC archive of HTTP exchanges originated by [=PIPs=] running alongside the [=PDP=]) and is managed alongside the [=Authorization Decision Log=] itself. When the external [=log=] is hosted by another organisation, the producing organisation SHOULD coordinate the retention of the external [=log=] with the retention of the [=log records=] that reference it, and SHOULD document this coordination in their logging policy.
</p>

The following example shows a [=log record=] for a request to find all subjects capable of approving a holiday request, where the call to the HR API is recorded in an external WARC log:

<aside class="example" title="Log record of a search request for managers with approval rights">

```json
{
    "trace_id": "28dbeec32e77635cc19bc3204ec56c41",
    "span_id": "17c59821784ee492",
    "parent_span_id": "c4e1d75a3f9b8240",
    "event_name": "adl.search_subject",
    "timestamp": 1757240136089,
    "status": "Unset",
    "attributes": {
        "adl.core.policies": {
            "git": "e4c15a063048367da367d5588d703b5e4a6b760e"
        },
        "adl.core.information": {
            "managers-api": { "span_id": "45deb36022f53afa" }
        }
    },
    "body": {
        "adl.core.request": {
            "subject": {
                "type": "user"
            },
            "action": {
                "name": "approve"
            },
            "resource": {
                "type": "holiday-request",
                "id": "446epbc8y7",
                "properties": {
                    "employee": "bob"
                }
            }
        },
        "adl.core.response": {
            "results": [
                {
                    "type": "user",
                    "id": "carol"
                },
                {
                    "type": "user",
                    "id": "dan"
                }
            ]
        }
    }
}
```

</aside>

The `adl.core.information` reference points to a [=span=] (`45deb36022f53afa`) within the same [=trace=]. That [=span=] represents the HR API call. The HTTP exchange of that call is logged as WARC entries indexed by the same `trace_id` and `span_id`:

<aside class="example" title="WARC entries for REST API call to HR system">

```warc
WARC/1.1
WARC-Type: request
WARC-Date: 2025-09-07T10:15:31Z
WARC-Record-ID: <urn:uuid:48bafbce-8d2a-45c1-9d7a-1a851c36e1c8>
Content-Type: application/http; msgtype=request
Content-Length: 142

GET /users/bob/managers?fields=can_sign HTTP/1.1
Host: hr.example.com
traceparent: 00-28dbeec32e77635cc19bc3204ec56c41-45deb36022f53afa-01

WARC/1.1
WARC-Type: response
WARC-Date: 2025-09-07T10:15:32Z
WARC-Record-ID: <urn:uuid:4a381180-21a7-4712-8706-5b321c17e3f8>
WARC-Concurrent-To: <urn:uuid:48bafbce-8d2a-45c1-9d7a-1a851c36e1c8>
Content-Type: application/http; msgtype=response
Content-Length: 175

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 107

{
    "alice": {
        "can_sign": false
    },
    "carol": {
        "can_sign": true
    },
    "dan": {
        "can_sign": true
    }
}
```

</aside>

</section>
