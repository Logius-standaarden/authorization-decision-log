# Architecture

This section describes the common EAM architecture within which the authorization decisions are logged.

## Context

The Authorization Decision Log defines a standard format for recording decisions made by Externalized Authorization Management (EAM) systems.

The goal of the standard is to enable the recreation of the environment in which historical authorization decisions were made to enable analysis of decisions while preventing unnecessary data duplication.

The inputs for records in the Authorization Decision Log come from the following standard EAM or PxP components as introduced in [[?NIST.SP.800-162]] and adopt the information model introduced in [[AuthZEN]].

<figure>
    <div class="mermaid" data-figure-name="eam-architecture.mermaid"></div>
    <figcaption>EAM or PxP Architecture</figcaption>
</figure>


In a federated context, such as introduced by [[FSC-Core]], both the consumer outway and provider inway function as a PEP for incoming and outgoing requests. Both the consumer and the provider ask an internal PDP to decide on allowing the request. Both of these decisions can be logged using this standard.

When combined with tracing headers such as [[trace-context]] introduced by [[?Logboek dataverwerkingen]] and the FSC Transaction ID used in [[FSC-Logging]], this enables full traceability across complex multi-organizational processing chains.

See the sequence diagram below for an example of such a flow.

<figure>
    <div class="mermaid" data-figure-name="federated-logging.mermaid"></div>
    <figcaption>Decision logging in federated context</figcaption>
</figure>


## Components

The standard EAM architecture has the following conceptual components. These can be deployed as standalone applications, combined in various configurations, or even implemented within a single monolithic application.

### Authorization Decision Log

The Authorization Decision Log contains all information that was used in the authorization decision. Using the Authorization Decision Log it *SHOULD* be possible to accurately recreate environmental factors that affected historical authorization decisions.

### Policy Enforcement Point (PEP)

A Policy Enforcement Point (PEP) intercepts a user's request, sends it to the Policy Decision Point (PDP) for evaluation, and then enforces the resulting "permit" or "deny" decision. A PEP is typically implemented as an API gateway or as a component within the application itself.

### Policy Administration Point (PAP)

A Policy Administration Point (PAP) is where access policies are authored, managed, and stored. It is responsible for distributing current policies to the PDP and archiving previous versions for traceability. This can be a dedicated commercial or open-source tool or a version control system like a Git repository.

### Policy Information Point (PIP)

A Policy Information Point (PIP) enriches access requests with additional attributes needed to make a decision. For example, it might retrieve a user's role or the sensitivity level of a data record from an external source. PIPs are often integrated directly into the PDP.

### Policy Decision Point (PDP)

A Policy Decision Point (PDP) evaluates incoming requests from the PEP against the relevant policies (from the PAP) and contextual data (from the PIP) to make a "permit" or "deny" decision. The PDP is often a separate application or sidecar container.

<p class="note" title="EAM components within a monolithic application">
It is important to keep in mind that these are architectural components. They can also be physically implemented in a single application. In such a case the authorization interceptor can be considered the PEP; the authorization handler, the PDP; the services it invokes, the PIP; and the Git repository of the application itself, the PAP.
</p>

## Scope

This section delineates the scope of the standard.

### No specification for the management of logs

The specification defines an interface for persisting log entries. This is the component that *MUST* be consistent across organizations to ensure interoperability.

The management of a log, however, is left to the discretion of individual implementations. Consequently, the specification does NOT define behavior or interfaces for:
- deleting or modifying log entries
- managing access to the log
- ensuring long-term accessibility
- handling archival and retention periods
- ensuring integrity and non-repudiation
- maintaining time-synchronization

See [[[#information-management]]] for an overview of various aspects which *MAY* be required for legal and regulatory compliance.

## Flows

### Writing a log record after an authorization decision

<figure>
    <div class="mermaid" data-figure-name="writing-log-record.mermaid"></div>
    <figcaption>Writing a log record after an authorization decision</figcaption>
</figure>

To provide accountability for historical authorization decisions it must be possible to recreate the information and environment that affected the decision. The PDP provides the information required for this to the Authorization Decision Log in the form of a Log Record, as defined in the specification below. 

The PDP *SHOULD* ensure that a Log Record has been persisted to durable storage before providing the Policy Enforcement Point with the decision. The PDP then flushes this durable storage to the Authorization Decision Log, ensuring that the log record has been persisted and can be used to provide accountability when needed.
