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

The [=log=] MUST enforce TLS on connections, in accordance with the standard practice established within the organization.

All components participating in evaluation [=authorization decisions=] (including [=PEPs=], [=PDPs=], [=PAPs=], and [=PIPs=]):

- MUST participate in distributed tracing as defined by the [[[trace-context]]] specification.
- MUST preserve [=trace=] continuity across component boundaries
- SHOULD ensure compatibility with OpenTelemetry and similar observability frameworks

### Trace propagation and initiation

When a [=PEP=] initiates an [=authorization decision=] request to a [=PDP=], the following rules apply:

- If the authorization request is part of an existing distributed trace, the [=PEP=] MUST propagate the active [`trace_id`](#trace_id) and parent `span_id` as defined by [[[trace-context]]].
- If no [=trace context=] is present, the [=PEP=] MUST create a new [=trace=] and corresponding root [=span=] for the authorization request.
- The [=PEP=] MUST create a [=span=] representing the authorization request and MUST propagate its context to the [=PDP=].

This ensures that [=authorization decisions=] are consistently correlated with the broader transaction or request lifecycle in which they occur.

### PDP span model for sub-requests

When a [=PDP=] requests additional information from [=PIPs=] or [=PAPs=] during the evaluation of an authorization decision request, the following rules apply:

- The [=PDP=] MUST propagate the active [`trace_id`](#trace_id) provided by the [=PEP=] and parent `span_id` as defined by [[[trace-context]]].
- If the [=PEP=] omitted a [=trace context=], the [=PDP=] MUST create a new [=trace=] and corresponding root [=span=] for the request for additional information.
- The [=PDP=] MUST create a new [=span=] representing the request for additional information and MUST propagate its context to the [=PIP=] or [=PAP=].

## Interface {#Interface}

A [=log record=] MUST contain the following mandatory fields and MAY contain the optional fields:

| Field | Type | Mandatory? |
| --- | --- | --- |
| [`trace_id`](#trace_id) | 16 byte | mandatory |
| [`span_id`](#span_id) | 8 byte | mandatory |
| [`timestamp`](#timestamp) | timestamp | mandatory |
| [`type`](#timestamp) | string | mandatory |
| [`request`](#request) | object | mandatory |
| [`response`](#response) | object | mandatory |
| [`policies`](#policies) | object | optional |
| [`information`](#information) | object | optional |
| [`configuration`](#configuration) | object | optional |
| [`transaction_id`](#transaction_id) | string | optional |

### `trace_id`

Unique identifier of the [=trace=] that follows data processing.

### `span_id`

Unique identifier of the [=span=] within the data processing.

### `timestamp`

The `timestamp` field represents the exact point in time when the [=authorization decision=] was made. The timestamp MUST be a `date-time` value as defined in <a data-cite="RFC3339#section-5.6">RFC 3339 § 5.6</a>.

### `type`

The `type` field represents the type of request that was made. This value identifies the [[AuthZEN]] endpoint that was invoked.

Its value MUST be a string containing the key value of the relevant endpoint as defined in "Endpoint Parameters" of the "Policy Decision Point Metadata" as defined in [[AuthZEN]] with the `_endpoint` suffix omitted.

<aside class="example">
For example, a request to the URL defined by the `search_subject_endpoint` in the [=PDP=] metadata would have the `type` of `search_subject`.
</aside>

### `request`

The `request` field is an object that represents the input to the decision. This field SHOULD contain the full request in [[AuthZen]] format as defined for the given request type.

For privacy reasons portions of the request, including required [[AuthZEN]] fields, MAY be omitted. If information is omitted, this omission MUST be documented or indicated in the [=log record=]. If the omitted information was used by the [=PDP=], then full accountability can no longer be provided.

### `response`

The `response` field is an object that represents the output of the decision. This field SHOULD contain the full response in [[AuthZen]] format as defined for the given request type.

For privacy reasons portions of the request, including required [[AuthZEN]] fields, MAY be omitted. If information is omitted, this omission MUST be documented or indicated in the [=log record=]. If information that was used by the [=PEP=] is omitted then full accountability can no longer be provided.

### `policies`

The `policies` field represents a versioned reference to the [=policies=] that the [=PDP=] used to evaluate the request. In a [=PxP=] architecture, this represents the information that would come from the [=PAP=].

A [=PDP=] can have one or more [=sources=] of [=policies=] which can be individually versioned. To accommodate that the `policies` field is an object in which each key identifies a specific, versioned, policy [=source=].

All policy [=sources=] that have affected the decision MUST be included. The value associated with each key refers to a unique version of the policy [=source=]. The information in this field MUST be sufficient to retrieve all [=policies=] from the policy [=sources=] that were used in the [=authorization decision=].

<aside class="example">
These could include:

- Timestamp
- Unique identifier
- Semantic version
- Git hash

</aside>

### `information`

The `information` field represents all the supporting information used in the evaluation of the access decision. In a [=PxP=] architecture, this field represents the information that would come from [=PIPs=].

It is an object in which each key identifies an information [=source=]. All information [=sources=] that have affected the decision SHOULD be included. The value of this field SHOULD either contain the information that was used in the access decision or be sufficient to retrieve the information.

### `configuration`

The `configuration` field represents the information required to [=reconstruct=] the software configuration that evaluated the original decision. In a [=PxP=] architecture, this primarily represents the configuration of the [=PDP=], but MAY also include configuration of [=PIPs=] and [=PAPs=].

It is an object in which each key identifies a configuration [=source=]. All configuration [=sources=] that have affected the decision SHOULD be included. The value of this field SHOULD either contain the configuration that was used in the access decision or be sufficient to retrieve the configuration.

<aside class="example">
These could include:

- Configuration of the policy engine ([=PDP=])
- Version of the policy language
- Identifier or hostname of the [=PDP=] in case multiple [=PDPs=] are used
- Configuration of [=PIPs=], such as API endpoints.
- Git hash of an IaaS definition, such as a Terraform repository.

</aside>

### `transaction_id`

Unique identifier of FSC transaction id of this request if a request is also logged as part of [[FSC-Logging]].

<div class="note">

The [=Authorization Decision Log=] and the FSC Log have the same granularity and can thus be combined into a single physical [=log=]. This specification ensures that no fields are defined that conflict with those defined in [[FSC-Logging]].

</div>

<section class="informative">

## Sources and referencing {#source-references}

[=Policy=], information and configuration [=sources=] MAY be included in the [=log=] directly.

This is generally undesirable however as it introduces duplication, increases the size of the [=log=] and increase security requirements for the [=log=] by including sensitive data.

To address this we describe several methods of referencing [=sources=] from the [=log=] below.

### Versioned sources

Some information [=sources=] offer the ability to 'time-travel' by providing a version at which to query. In such cases, the data itself may be omitted and the version can be stored instead.

The version identifier can be a simple value, such as a string or number, or a complex object, such as an array or object containing multiple version identifiers.

The following example shows a reference to a specific semantic version of a policy [=source=].

<aside class="example" title="Policy source reference using semantic versioning">

```json
{
    "traffic-policy": "gmb-2025-94604@1.1"
}
```

</aside>

In a complex case, such as limiting requests for open data per IP per minute across a large number of servers, the version could also consist of an array of partition offsets in a Kafka stream of HTTP request.

<aside class="example" title="Complex versioned information sources using Kafka partition offsets">

```json
{
    "nginx-requests": [ 8376912, 8368118, 8377785, 8386285, 8383526 ]
}
```

</aside>

### Temporal sources

In case the [=source=] of information offers the ability to 'time-travel' by providing a timestamp at which to query, then the data itself may be omitted.

It is RECOMMENDED to use the timestamp defined in the `time` field in the `context` of the `request` as the base time. In that case the information [=source=] MAY be omitted fully.

If a different timestamp is used, then it SHOULD be included in [[RFC3339]] format.

<p class="note" title="Inter-system clock inconsistencies">
When system clocks are not aligned properly, a system may be asked to provide information for a timestamp that lies in the future. This can be mitigated by requesting the [=policies=] of a few seconds or minutes ago at the expense of reducing the speed with which policy changes can be deployed.
</p>

<p class="note" title="Usage of REST API Design Rules">
In the context of REST APIs developed by the Dutch government the <a href="https://docs.geostandaarden.nl/api/API-Strategie-ext/#temporal">Temporal extension</a> of the [[ADR]] can be used for this purpose.
</p>

### Logged sources

For information [=sources=] that are logged in an external [=log=], a request identifier is needed to look up the corresponding request in the external [=log=].

It is RECOMMENDED to use [[[trace-context]]] as the request identifier. Such a request SHOULD have the same `trace_id` as the request to the [=PDP=], in which case the [=source=] reference can consist of only the value of the `span_id`.

It is RECOMMENDED to log requests in the [[WARC]] format as it includes all request and response headers that may be used in the [=authorization decision=].

The following example shows a [=log record=] for a request to find all subjects capable of approving a holiday request:

<aside class="example" title="Log record of a search request for managers with approval rights">

```json
{
    "timestamp": "2025-09-07T10:15:36Z",
    "trace_id": "28dbeec32e77635cc19bc3204ec56c41",
    "span_id": "17c59821784ee492",
    "type": "search_subject",
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
    },
    "policies": {
        "git": "e4c15a063048367da367d5588d703b5e4a6b760e"
    },
    "information": {
        "managers-api": "45deb36022f53afa"
    }
}
```

</aside>

Which would result in the following WARC entries logging the REST API call to the HR system:

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
