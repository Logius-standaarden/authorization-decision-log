# Specifications

This section provides the specification for the protocols and interfaces to be used and the expected behavior of the components.

## Protocols

The protocols used between the engine and the [=log=] are not prescribed in this standard.

<div class="note">
Note, by "the protocols" we mean the method of delivering messages between components. This standard does describe the interfaces of the messages themselves. The components <i>MUST</i> comply with the interfaces to ensure interoperability between component functionalities. The standard does not prescribe how that information is passed between components, as this depends on the technical/architectural choices made by software developers. This provides the freedom to apply the standard to almost any software solution.
</div>

It is RECOMMENDED to use [the OpenTelemetry Protocol (OTLP)](https://opentelemetry.io/docs/specs/otlp/) for the interaction between the Application and the log.

<div class="note">
OpenTelemetry is a standard and open-source framework for managing, generating, collecting, and exporting telemetry data. Using this open standard can prevent vendor-specific integrations. OpenTelemetry is a CNCF incubating project.
</div>

When using HTTP-based protocols (e.g., HTTP/1.1 [[RFC9112]] or HTTP/2 [[RFC9113]]), implementations MUST use the [[[trace-context]]] HTTP header format (`traceparent`, `tracestate`) for propagation.

For non-HTTP protocols (e.g., gRPC, messaging systems), implementations MUST provide equivalent [=trace context=] propagation semantics, ensuring that `trace_id`, `span_id`, and parent relationships are preserved across boundaries.

<div class="note">
In the absence of a formally standardized propagation mechanism for a given protocol, implementations SHOULD adopt widely accepted conventions (e.g., OpenTelemetry context propagation) while maintaining semantic equivalence with [[[trace-context]]].
</div>

## Behavior

### TLS

The [=log=] MUST enforce TLS on connections, in accordance with the standard practice established within the organization.

### Tracing

All components participating in the evaluation of [=authorization decisions=] (including [=PEPs=], [=PDPs=], [=PAPs=], and [=PIPs=]):

- MUST participate in distributed tracing as defined by the [[[trace-context]]] specification
- MUST preserve [=trace=] continuity across component boundaries
- SHOULD ensure compatibility with OpenTelemetry and similar observability frameworks

The same rule applies on every request-scoped hop in the evaluation of an [=authorization decision=], whether the sender is a [=PEP=] calling a [=PDP=], a [=PDP=] calling a [=PIP=] or [=PAP=], or any other component:

- On receiving an incoming request, the component MUST create a [=span=] as a child of the [=span=] identified by the incoming `traceparent`, or — if no [=trace context=] is present — start a new [=trace=] with a root [=span=].
- When making an outgoing request, the component MUST emit a `traceparent` carrying the active [`trace_id`](#trace_id) and its own current `span_id` as the `parent-id`, as defined by [[[trace-context]]].

This ensures that every [=span=] correctly identifies its immediate parent, and that [=authorization decisions=] are consistently correlated with the broader transaction or request lifecycle in which they occur.

<figure>
    <div class="mermaid" data-figure-name="decision-trace.mermaid"></div>
    <figcaption>Trace and spans during the evaluation of an authorization decision</figcaption>
</figure>

<p class="note" title="Pro-active interactions are outside the trace">
Pro-active interactions — for example, a [=PAP=] distributing [=policies=] to a [=PDP=], or a [=PIP=] pre-populating data into a [=PDP=] — happen outside the scope of any individual [=authorization decision=] and are not part of its [=trace=]. They are independent operations with their own lifecycle and, where applicable, their own [=traces=].
</p>

## Interface {#Interface}

A [=log record=] MUST contain the following mandatory fields and MAY contain the optional fields:

| Field | Type | Mandatory? |
| --- | --- | --- |
| [`trace_id`](#trace_id) | 16 byte | mandatory |
| [`span_id`](#span_id) | 8 byte | mandatory |
| [`event_name`](#event_name) | string | mandatory |
| [`timestamp`](#timestamp) | timestamp | mandatory |
| [`attributes`](#attributes) | object | mandatory |
| [`body`](#body) | object | optional |

### `trace_id`

Unique identifier of the [=trace=] that follows data processing.

### `span_id`

Unique identifier of the [=span=] within the data processing.

### `event_name`

The `event_name` field identifies the [=log record=] as an ADL accountability record. It MUST be `adl.<endpoint_key>`, where `endpoint_key` is the value of the relevant endpoint as defined in "Endpoint Parameters" of the "Policy Decision Point Metadata" in [[AuthZEN]], with the `_endpoint` suffix omitted.

The `adl.` prefix avoids collisions with other events in the same backend and allows [=log records=] to be filtered or indexed by themselves.

<aside class="example">
A request to the URL defined by the `search_subject_endpoint` in the [=PDP=] metadata would produce a [=log record=] with `event_name` of `adl.search_subject`.
</aside>

### `timestamp`

The `timestamp` field represents the exact point in time when the [=authorization decision=] was made. The timestamp MUST be a `date-time` value as defined in <a data-cite="RFC3339#section-5.6">RFC 3339 § 5.6</a>.

### `attributes`

The `attributes` object contains [=source=] references and metadata for the [=authorization decision=].

Each `adl.*` entry in `attributes` MUST be a [=source=] reference (see [[[#source-references]]] for the available reference patterns). Raw payloads MUST NOT be inlined in `attributes`; they belong in [`body`](#body).

The following `adl.*` attributes are defined by this specification:

| Attribute | Type | Mandatory? |
| --- | --- | --- |
| [`adl.request`](#adl-request) | object | conditional, see below |
| [`adl.response`](#adl-response) | object | conditional, see below |
| [`adl.policies`](#adl-policies) | object | conditional, see below |
| [`adl.information`](#adl-information) | object | conditional, see below |
| [`adl.configuration`](#adl-configuration) | object | conditional, see below |
| [`fsc.transaction_id`](#fsc-transaction_id) | string | optional |

For each `adl.*` field that affected the decision, the data MUST be retrievable from the [=log record=] either:

- as raw data in [`body`](#body), or
- via a [=source=] reference in `attributes`.

A field MAY appear in both (for example, raw data in `body` alongside a Versioned reference in `attributes` for verification).

#### `adl.request` {#adl-request}

The `adl.request` attribute is a [=source=] reference to the input of the decision when the raw request is not carried in [`body`](#body). The reference MUST resolve to the request in [[AuthZEN]] format.

For privacy reasons portions of the request, including required [[AuthZEN]] fields, MAY be omitted from both the reference target and `body`. If information is omitted, this omission MUST be documented or indicated in the [=log record=]. If the omitted information was used by the [=PDP=], then full accountability can no longer be provided.

#### `adl.response` {#adl-response}

The `adl.response` attribute is a [=source=] reference to the output of the decision when the raw response is not carried in [`body`](#body). The reference MUST resolve to the response in [[AuthZEN]] format.

For privacy reasons portions of the response, including required [[AuthZEN]] fields, MAY be omitted from both the reference target and `body`. If information is omitted, this omission MUST be documented or indicated in the [=log record=]. If information that was used by the [=PEP=] is omitted, then full accountability can no longer be provided.

#### `adl.policies` {#adl-policies}

The `adl.policies` attribute references the [=policies=] that the [=PDP=] used to evaluate the request. In a [=PxP=] architecture, this represents the information that would come from the [=PAP=].

A [=PDP=] can have one or more [=sources=] of [=policies=] which can be individually versioned. To accommodate that, `adl.policies` is an object in which each key identifies a specific policy [=source=].

All policy [=sources=] that affected the decision MUST be referenced. Each value MUST be a [=source=] reference (see [[[#source-references]]]) sufficient to retrieve the [=policies=] from that [=source=].

<aside class="example">
A reference value could be:

- A timestamp
- A unique identifier
- A semantic version
- A Git hash

</aside>

#### `adl.information` {#adl-information}

The `adl.information` attribute references the supporting information used in evaluating the access decision. In a [=PxP=] architecture, this represents the information that would come from [=PIPs=].

It is an object in which each key identifies an information [=source=]. All information [=sources=] that affected the decision SHOULD be referenced. Each value MUST be a [=source=] reference (see [[[#source-references]]]) sufficient to retrieve the information.

#### `adl.configuration` {#adl-configuration}

The `adl.configuration` attribute references the configuration required to [=reconstruct=] the software environment that evaluated the original decision. In a [=PxP=] architecture, this primarily represents the configuration of the [=PDP=], but MAY also include configuration of [=PIPs=] and [=PAPs=].

It is an object in which each key identifies a configuration [=source=]. All configuration [=sources=] that affected the decision SHOULD be referenced. Each value MUST be a [=source=] reference (see [[[#source-references]]]) sufficient to retrieve the configuration.

<aside class="example">
A configuration [=source=] could reference:

- The configuration of the policy engine ([=PDP=])
- The version of the policy language
- The identifier or hostname of the [=PDP=] in case multiple [=PDPs=] are used
- The configuration of [=PIPs=], such as API endpoints
- The Git hash of an IaaS definition, such as a Terraform repository

</aside>

#### `fsc.transaction_id` {#fsc-transaction_id}

Unique identifier of the FSC transaction id of this request if the request is also logged as part of [[FSC-Logging]].

<div class="note">

The [=Authorization Decision Log=] and the FSC Log have the same granularity and can thus be combined into a single physical [=log=]. This specification ensures that no fields are defined that conflict with those defined in [[FSC-Logging]].

</div>

### `body`

The `body` field carries the raw `adl.*` payloads. It is an object that MAY contain any of the following keys:

- `request` - full request in [[AuthZEN]] format
- `response` - full response in [[AuthZEN]] format
- `policies` - full policies that affected the decision
- `information` - full information that affected the decision
- `configuration` - full configuration that affected the decision

A `body` MAY contain a subset of these keys; any field not in `body` MUST be referenced from [`attributes`](#attributes). `body` MAY be omitted entirely when every relevant `adl.*` field is referenced via [`attributes`](#attributes).

## Span attributes

This section describes how a [=log record=] relates to the [=span=] representing the [=PDP=]'s evaluation when the two are emitted using OpenTelemetry. The [=log record=] interface defined in [[[#Interface]]] is an information model and does not require OpenTelemetry; it may be emitted via any transport.

The [=log record=] is correlated with the [=span=] via [`trace_id`](#trace_id) and [`span_id`](#span_id). The [=span=]'s `name` SHOULD equal the AuthZEN endpoint key — the same value used (with `adl.` prefix) in [`event_name`](#event_name) — so [=authorization decisions=] can be identified in tracing tools without joining to the [=log record=].

Implementations MAY additionally mirror selected `adl.*` attributes from the [=log record=] onto the [=span=]'s attributes (for example, the `adl.policies` reference) to enable filtering of decisions in tracing tools. The standard does not require this.

<section class="informative">

## Sources and referencing {#source-references}

A [=source=] reference is any compact value from which the referenced data can be retrieved, letting a [=log record=] omit the raw payload from [`body`](#body) without loss of accountability.

The patterns described below illustrate common reference formats. Implementations are free to use any other format with these properties.

### Versioned sources

Some [=sources=] offer the ability to 'time-travel' by providing a version at which to query. In such cases, the data itself may be omitted and the version can be stored instead.

The version identifier can be a simple value, such as a string or number, or a complex object, such as an array or object containing multiple version identifiers.

The following example shows a reference to a specific semantic version of a policy [=source=].

<aside class="example" title="Policy source reference using semantic versioning">

```json
{
    "traffic-policy": "gmb-2025-94604@1.1"
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

### Temporal sources

In case a [=source=] offers the ability to 'time-travel' by providing a timestamp at which to query, then the data itself may be omitted.

It is RECOMMENDED to use the timestamp defined in the `time` field in the `context` of the `request` as the base time. In that case the [=source=] MAY be omitted fully.

If a different timestamp is used, then it SHOULD be included in [[RFC3339]] format.

<p class="note" title="Inter-system clock inconsistencies">
When system clocks are not aligned properly, a system may be asked to provide data for a timestamp that lies in the future. This can be mitigated by requesting data of a few seconds or minutes ago at the expense of reducing the speed with which changes can be deployed.
</p>

<p class="note" title="Usage of REST API Design Rules">
In the context of REST APIs developed by the Dutch government the <a href="https://docs.geostandaarden.nl/api/API-Strategie-ext/#temporal">Temporal extension</a> of the [[ADR]] can be used for this purpose.
</p>

### Logged sources

For [=sources=] that are logged in an external [=log=], a request identifier is needed to look up the corresponding entry in the external [=log=].

It is RECOMMENDED to use [[[trace-context]]] as the request identifier. The referenced request SHOULD have the same `trace_id` as the [=log record=], in which case the [=source=] reference can consist of only the value of the `span_id`.

It is RECOMMENDED to log requests in the [[WARC]] format as it includes all request and response headers that may be used in the [=authorization decision=].

The following example shows a [=log record=] for a request to find all subjects capable of approving a holiday request, where the call to the HR API is recorded in an external WARC log:

<aside class="example" title="LogRecord of a search request for managers with approval rights">

```json
{
    "trace_id": "28dbeec32e77635cc19bc3204ec56c41",
    "span_id": "17c59821784ee492",
    "event_name": "adl.search_subject",
    "timestamp": "2025-09-07T10:15:36.089Z",
    "attributes": {
        "adl.policies": {
            "git": "e4c15a063048367da367d5588d703b5e4a6b760e"
        },
        "adl.information": {
            "managers-api": { "span_id": "45deb36022f53afa" }
        }
    },
    "body": {
        "request": {
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
        "response": {
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

The `adl.information` reference points to a [=span=] (`45deb36022f53afa`) within the same [=trace=]. That [=span=] represents the HR API call. The HTTP exchange of that call is logged as WARC entries indexed by the same `trace_id` and `span_id`:

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

### Sub-span sources

When the [=PDP=] makes calls to [=PIPs=] or [=PAPs=] during evaluation, those calls are modelled as child [=spans=] within the same [=trace=] (see [Tracing](#tracing)). An `adl.information` or `adl.policies` [=source=] MAY reference such a child [=span=] using only its `span_id`; the `trace_id` is implicit because the child [=span=] is part of the same [=trace=] as the [=log record=].

<aside class="example" title="Sub-span source reference">

```json
{
    "can-sign-api": { "span_id": "836ff5286112f460" }
}
```

</aside>

A Sub-span [=source=] reference points to a [=span=]. This standard does not prescribe what data is associated with that [=span=]; implementations MAY persist additional context (for example via OpenTelemetry log records) using their own conventions.

<p class="note">
Implementations using Sub-span [=source=] references SHOULD ensure the referenced [=spans=] remain available for at least the same retention period as the parent [=log record=]. If the referenced [=span=] is no longer available, the corresponding [=source=] data cannot be retrieved.
</p>

</section>
