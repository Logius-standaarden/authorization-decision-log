# Data Verifiability and Level of Detail

The ability to provide accountability depends on the log's level of detail. A balance must be struck between capturing enough information to accurately replay historical decisions and practical challenges like data duplication and scalability. The appropriate level of detail depends on the organization's specific context and legal requirements, as the highest level is not always necessary.

To ensure historical accuracy while minimizing data storage, referencing external information (e.g., via a timestamp or version number) is preferred over storing copies. This approach keeps logs lean but is contingent on the ability of source systems to provide versioned historical data.

For full replayability, the log must also identify the exact version and configuration of the policy engine that evaluated the decision; however, providing reliable versioning for the engine may not always be feasible, depending on the infrastructure.

## Definition of Levels

We have identified four levels of detail, in order from least to most detail. Each level builds on the information from the previous level.

### Level 1: Decision Request/Response

At the most basic level only the decision request and the decision response are logged.

<p class="note" title="Engine boundaries">
The decision request and response <i>MAY</i> contain all information required for an audit log, as described by [[?ISO/IEC 27002:2022]] and [[?BIO2]]. If that is the case, and all auditable actions are decided on by the PDP, the Authorization Decision Log <i>MAY</i> be used as an audit log.
</p>

At this level of detail log requests contain all keys that are described as mandatory in [[[#specifications]]].

#### Example

### Level 2: Decision and Policies

In addition to the request and response, one can refer to the exact version of the <a>policies</a> that were used to evaluate the request. This can be achieved by incorporating the [`policies`](#policies) field.

#### Example 
We can extend the example of the holiday-approval request by adding a reference to a Git repository in which current HR approval policies are documented. In the example below the git hash of the version currently deployed together with the PDP is `6266d07750c44b4c9b05d0801b752c0ef884e4f6`.

<aside class="example" title="Git-versioned policy source">

```json
{
    "hr": "6266d07750c44b4c9b05d0801b752c0ef884e4f6"
}
```

</aside>

More complex references can be achieved by using an object as the version identifier. If, for example, the HR application takes part in a federation with predefined policies for different maturity levels. The following example shows how those policies can be referenced using a semantic version combined with a filter for policies relevant to the current maturity level.

<aside class="example" title="Complex policy source reference">

```json
{
    "hr": "6266d07750c44b4c9b05d0801b752c0ef884e4f6",
    "federation": {
        "version": "2.7.1",
        "filter": "maturity_level <= 3"
    }
}
```

</aside>

A log record as expressed as a JSON object for this scenario:

<aside class="example" title="Log record of denied holiday approval including policies">

```json
{
    "timestamp": "2025-09-07T10:14:18Z",
    "trace_id": "28dbeec32e77635cc19bc3204ec56c41",
    "span_id": "893e1b2ac52d712f",
    "type": "evaluation",
    "request": {
        "subject": {
            "type": "user",
            "id": "alice"
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
        },
        "context": {
            "traceparent": "00-28dbeec32e77635cc19bc3204ec56c41-dec5220770f8f4f4-01"
        }
    },
    "response": {
        "decision": false,
        "context": {
            "reason": {
                "48": "No signing authority"
            }
        }
    },
    "policies": {
        "hr": "6266d07750c44b4c9b05d0801b752c0ef884e4f6",
        "federation": {
            "version": "2.7.1",
            "filter": "maturity_level <= 3"
        }
    }
}
```

</aside>

### Level 3: All Information Sources

All information used in the evaluation can be programmatically retrieved. This allows full replayability, assuming the engine (PDP) behaves identically or can be manually recreated in the correct state, which is generally achievable.

At this level of detail log requests contain the following keys, as defined in [[[#specifications]]]:

<!-- | Field          | Required  | Reference                 |
|----------------|-----------|---------------------------|
| `trace_id`     | optional  | [[[#spec-trace-context]]] |
| `span_id`      | optional  | [[[#spec-trace-context]]] |
| `timestamp`    | required  | [[[#spec-timestamp]]]     |
| `type`         | required  | [[[#spec-type]]]          |
| `request`      | required  | [[[#spec-request]]]       |
| `response`     | required  | [[[#spec-response]]]      |
| `policies`     | required  | [[[#spec-policies]]]      |
| `information`  | required  | [[[#spec-information]]]   | -->

### Level 4: Full Environment

In addition to all information used in the evaluation, the environment and configuration of the system that evaluates the decision can also be accurately recreated. This provides full, guaranteed replayability and maximum accountability.

<p class="note" title="System boundaries">
The configuration of all components that influence the decision should be included. While this may be limited to the configuration of the PDP, it often also requires configuration of the PIP and sometimes the PAP as well.
</p>

At this level of detail log requests contain the following keys, as defined in [[[#specifications]]]:

<!-- | Field           | Required  | Reference                  |
|-----------------|-----------|----------------------------|
| `trace_id`      | optional  | [[[#spec-trace-context]]]  |
| `span_id`       | optional  | [[[#spec-trace-context]]]  |
| `timestamp`     | required  | [[[#spec-timestamp]]]      |
| `type`          | required  | [[[#spec-type]]]           |
| `request`       | required  | [[[#spec-request]]]        |
| `response`      | required  | [[[#spec-response]]]       |
| `policies`      | required  | [[[#spec-policies]]]       |
| `information`   | required  | [[[#spec-information]]]    |
| `configuration` | required  | [[[#spec-configuration]]]  | -->

## Implications of levels

The higher the level of detail, the more useful the log is for determining the context of an authorization decision. On the other hand, higher levels of detail also introduce challenges around scalability, technical feasibility, and security.

Conversely, the lowest level of detail may not be sufficient to provide effective accountability. This depends on the data processing which is being authorized and legal requirements for it.

For that reason it's important to decide for different use cases which level of detail is required and appropriate. Aiming for the highest level of detail for all authorization decisions is thus not necessary.
