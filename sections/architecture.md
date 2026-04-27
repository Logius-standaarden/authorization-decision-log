# Architecture

The goal of the standard is to enable the [=reconstruction=] of the environment in which historical [=authorization decisions=] were made, allowing those decisions to be analysed and [=replayed=] while preventing unnecessary data duplication.

The inputs for records in the <a>Authorization Decision Log</a> come from the following standard [=EAM=] or <a>PxP</a> components as introduced in [[[?NIST.SP.800-162]]] and adopt the information model introduced in [[AuthZEN]].

<figure>
    <div class="mermaid" data-figure-name="eam-architecture.mermaid"></div>
    <figcaption>EAM or PxP Architecture</figcaption>
</figure>

In a federated context, such as introduced by [[FSC-Core]], both the consumer outway and provider inway function as a <a>PEP</a> for incoming and outgoing requests. Both the consumer and the provider ask an internal <a>PDP</a> to decide on allowing the request. Both of these decisions can be logged using this standard.

When combined with tracing headers per [[trace-context]] (also adopted by [[LDV]]) and the FSC Transaction ID used in [[FSC-Logging]], this enables full traceability across complex multi-organizational processing chains.

See the sequence diagram below for an example of such a flow.

<figure>
    <div class="mermaid" data-figure-name="federated-logging.mermaid"></div>
    <figcaption>Decision logging in federated context</figcaption>
</figure>

## Components

The standard [=EAM=] architecture has the following conceptual components. These can be deployed as standalone applications, combined in various configurations, or even implemented within a single monolithic application.

<dfn data-lt="ADL">Authorization Decision Log</dfn>

The Authorization Decision Log contains all information that was used in the [=authorization decision=]. Using the <a>Authorization Decision Log</a> it SHOULD be possible to accurately [=reconstruct=] environmental factors that affected historical [=authorization decisions=].

<dfn data-lt="PEP|PEPs|Policy Enforcement Points">Policy Enforcement Point</dfn>

A Policy Enforcement Point (PEP) intercepts a user's request, sends it to the <a>PDP</a> for evaluation, and then enforces the resulting "permit" or "deny" decision. A <a>PEP</a> can be implemented as an API gateway, as application middleware or as a component within the application itself.

<dfn data-lt="PAP|PAPs|Policy Administration Points">Policy Administration Point</dfn>

A Policy Administration Point (PAP) is where access [=policies=] are authored, managed, and stored. It is responsible for distributing current policies to the <a>PDP</a> and archiving previous versions for traceability. This can be a dedicated commercial or open-source tool or a version control system like a Git repository.

<dfn data-lt="PIP|PIPs|Policy Information Points">Policy Information Point</dfn>

A Policy Information Point (PIP) enriches access requests with additional attributes needed to make a decision. For example, it might retrieve a user's role or the sensitivity level of a data record from an external <a>source</a>. <a>PIPs</a> are often integrated directly into the <a>PDP</a>.

<dfn data-lt="PDP|PDPs|Policy Decision Points">Policy Decision Point</dfn>

A Policy Decision Point (PDP) evaluates incoming requests from the <a>PEP</a> against the relevant [=policies=] (from the <a>PAP</a>) and contextual data (from the <a>PIP</a>) to make a "permit" or "deny" decision. The <a>PDP</a> is often a separate application or sidecar container.

<p class="note" title="EAM components within a monolithic application">
These are architectural roles, not deployment boundaries. A single application can fulfil all four: the authorization interceptor as the <a>PEP</a>, the authorization handler as the <a>PDP</a>, the services it invokes as <a>PIPs</a>, and the application's own Git repository as the <a>PAP</a>.
</p>

## Scope

The specification defines an interface for persisting [=log records=]. This is the component that MUST be consistent across organizations to ensure interoperability.

Any [=authorization decision=] representable in the [[AuthZEN]] information model is in scope of this standard, regardless of the wire protocol by which the decision is delivered.

The management of a [=log=], however, is left to the discretion of individual implementations. Consequently, the specification does NOT define behavior or interfaces for:

- deleting or modifying [=log records=]
- managing access to the [=log=]
- ensuring long-term accessibility
- handling archival and retention periods
- ensuring integrity and non-repudiation
- maintaining time synchronisation

See <a href="#information-management">Information management</a> for an overview of various aspects which MAY be required for legal and regulatory compliance.

## Flows

### Evaluating an authorization decision

<figure>
    <div class="mermaid" data-figure-name="decision-evaluation.mermaid"></div>
    <figcaption>Evaluating an authorization decision</figcaption>
</figure>

When a <a>PEP</a> needs an [=authorization decision=] it sends an evaluation request to the <a>PDP</a>. The <a>PDP</a> evaluates the request against the [=policies=] received from the <a>PAP</a> and pre-populated information from <a>PIPs</a>, MAY query <a>PIPs</a> for additional dynamic information, and returns the decision.

The <a>PAP</a> distributes [=policies=] and <a>PIPs</a> pre-populate static information into the <a>PDP</a> on their own schedule, independently of any individual [=authorization decision=].

See [Tracing](#tracing) for how this flow maps onto a [=trace=] and its [=spans=].

### Writing a log record

<figure>
    <div class="mermaid" data-figure-name="writing-log-record.mermaid"></div>
    <figcaption>Writing a log record after an authorization decision</figcaption>
</figure>

To provide accountability for historical [=authorization decisions=] it needs to be possible to [=reconstruct=] the information and environment that affected the decision. The <a>PDP</a> provides the information required for this to the <a>Authorization Decision Log</a> in the form of a <a>log record</a>.

The <a>PDP</a> SHOULD ensure that a <a>log record</a> has been persisted to durable storage before providing the <a>PEP</a> with the decision. Once the <a>log record</a> has reached durable storage, an asynchronous flush to the <a>Authorization Decision Log</a> completes ingestion. The component responsible for this flush is implementation-defined and MAY be the <a>PDP</a>, a sidecar (such as the OpenTelemetry Collector or Fluent Bit), or a host-level log collector.

<p class="note" title="Definition of durable storage">
"Durable storage" is intentionally not defined by this specification. Organisations MUST define a working definition in their logging policy, taking into account their risk appetite and operational constraints. Common interpretations range from a local <code>fsync</code>'d write to a replicated commit on a queue with quorum. See <a href="#information-management">Information management</a> for related considerations.
</p>

<p class="note" title="Common pattern: write-ahead log with asynchronous flush">
A widely deployed pattern is to write the <a>log record</a> to a local write-ahead log (durable storage) before the <a>PDP</a> returns the decision, then asynchronously flush from the write-ahead log to the <a>Authorization Decision Log</a> with idempotent ingestion. This pattern bounds the synchronous-path latency while preserving the durability guarantee.
</p>
