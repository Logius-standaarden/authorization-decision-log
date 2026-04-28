# Information Management and Compliance {#information-management}

Conformance to this standard does not, by itself, guarantee legal or regulatory compliance. The implementing organization is solely responsible for ensuring its implementation adheres to all applicable frameworks, such as the General Data Protection Regulation (GDPR / AVG) and relevant security baselines, such as [[?ISO/IEC 27001:2022]], [[?ISO/IEC 27002:2022]], and [[?BIO2]]. Each organization is responsible for its own <a>Authorization Decision Log</a>. There is no central [=log=], although [=logs=] of several organizations can be aggregated if desired.

The following sections list aspects that should be taken into consideration when creating a compliant and secure logging solution.

## Legal and Privacy Compliance

Logging [=authorization decisions=] creates a new processing of data, which is subject to privacy regulations when personal data is involved.

### Purpose Limitation

When collecting personal data, the specific purposes for logging (e.g., operational auditing, forensic analysis, citizen accountability) should be defined and documented in a formal policy before implementation, in line with the purpose-limitation principle of [[?AVG]] art. 5(1)(b). Data collection should be limited to those defined purposes.

### Data Minimization

A core principle is to avoid storing unnecessary information, especially sensitive data. The goal is to make the [=log=] precise, compact, and manageable. Instead of duplicating large amounts of (personal) data, prefer storing only the data used in the decision or even just a reference that allows the state at the time of the decision to be [=reconstructed=].

A logging policy that manages what is logged based on risk should be in place. When logging sensitive data for high-risk use cases, this should be explicitly documented and approved.

Implementers should consider pseudonymization and anonymization for personal data, in line with the data-masking control in section 8.11 of [[?ISO/IEC 27002:2022]]. For example, personal identifiers can be hashed or aliased and location data can be randomized.

When aggregate statistics, such as decisions per type per time period, are sufficient, implementers should consider using aggregation as a method of data minimization and anonymization.

### Data Retention

A data retention policy is required by [[?AVG]] art. 5(1)(e) and should be defined and enforced. Retention periods should be based on the defined purposes and legal obligations, and may differ for different types of [=log records=].

As a general guideline, operational logs (for debugging, support) should be retained for a short period (months), while forensic/audit logs  may be retained for longer periods (years).

For implementations within Dutch public-sector organisations, retention is also subject to the Archiefwet and the applicable Selectielijst — for example, the Selectielijst gemeenten en intergemeentelijke organen for municipal deployments, or the central-government Selectielijst for ministries. Retention periods chosen for [=logs=] should be reconciled with these obligations.

[=Logs=] that have exceeded their defined retention period should be automatically and securely purged in line with the secure-deletion control in section 8.10 of [[?ISO/IEC 27002:2022]].

When `attributes.adl.core.*` carries [=source=] references rather than raw payloads, the upstream [=sources=] MUST remain retrievable for the full retention period of the referencing [=log records=]; otherwise the accountability claim of the referencing [=log record=] is invalidated. Coordination of upstream retention is the responsibility of the producing organisation and should be documented in its logging policy. See [[[#source-references]]] for the related Versioned, Temporal, and Logged source patterns.

### Transparency and Subject Rights

If [=logs=] contain personal data, they should be designed to support data subject access requests under [[?AVG]] art. 15. To enable subject-access queries that span ADL and [[LDV]], implementations SHOULD include the `dpl.core.data_subject_id` attribute defined by [[LDV]] in `attributes` when the request involves personal data. This anchors the [=log record=] to the data subject in the same convention used by LDV.

The [=log=]'s structure, purpose, and retention are to be documented in the organization's Register of Processing Activities, as required by [[?AVG]] art. 30.

Implementations whose [=log=] content constitutes large-scale or high-risk processing of personal data are subject to the DPIA requirement under [[?AVG]] art. 35. This standard does not impose a DPIA requirement; it does require organisations to assess whether one applies. The DPIA-leidraad published by the Autoriteit Persoonsgegevens can serve as the basis for such an assessment. When a DPIA is performed, the choice of detail level, retention period, and access scope of the [=Authorization Decision Log=] should be considered as part of it.

## Access Control

Access to log data should be restricted based on the principle of least privilege.

It is essential to define clear [=policies=] for authorizing access to the <a>Authorization Decision Log</a> or parts thereof. These decisions to provide or deny access to the [=log=] should also be included in the <a>Authorization Decision Log</a>.

Common and important usage policies include:

- **(Forensic) Audits**: The [=log=] is a critical tool for auditing and forensic analysis after a security incident or data breach. It can help determine what actions were permitted at a specific time and on what basis, even if that permission was technically correct but improper in hindsight.
- **Observability in Trust Frameworks**: The [=log=] offers a structured method for data users to provide insight into their data usage to data providers when required, as may be required in trust frameworks. It thus offers an implementation standard for "Observability services" as defined for data spaces under the EU Data Act.
- **Debugging and Support**: The [=log=] can be a useful tool for determining why the [=authorization=] is not working as expected. It can also contain highly sensitive data, however, so it's essential to carefully define if, and under which conditions, the <a>Authorization Decision Log</a> can be used for this purpose.

## Security and Integrity

The [=log=] should be protected against unauthorized access, modification, and deletion. The relevant operational baselines for the Dutch government context are [[?ISO/IEC 27002:2022]] (mirrored in [[?BIO2]]).

Key concerns for ensuring security and integrity include:

- **Transport Security**: It's recommended to use mTLS (Mutual Transport Layer Security) for network connections that transport log data to ensure authenticated and encrypted transport.
- **Encryption at Rest**: All log data should be encrypted at rest. It's recommended to manage this using a Key Management System (KMS).
- **Data Integrity**: The [=log=] should be configured as append-only storage (WORM) to prevent undetected modification or deletion, in line with section 5.33 of [[?ISO/IEC 27002:2022]]. Mechanisms such as a cryptographic hash chains and periodic cryptographic sealing can be used to ensure integrity and non-repudiation of [=logs=].
- **Time Synchronization**: All systems involved in generating and storing [=logs=] should be synchronized to a trusted Network Time Protocol (NTP) source to ensure a reliable and accurate timeline of events, in line with section 8.17 of [[?ISO/IEC 27002:2022]].
- *Ingestion*: The logging endpoint should be implemented as idempotent writes to an asynchronous, buffered service (e.g., using a durable queue) to mitigate latency and availability risks in the event of log-ingest failures. See [[[#ingestion]]] for the normative idempotency rule.
