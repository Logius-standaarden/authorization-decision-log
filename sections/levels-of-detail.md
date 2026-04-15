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

At this level of detail log requests contain all keys that are described as mandatory in [[[#Interface]]].

#### Example

In the following example a manager called Alice attempts to approve a holiday request for a team member called Bob, but the request is denied because she does not have signing authority.

Her browser submits the following request to the API:

<aside class="example" title="HTTP request for holiday approval">

```http
POST /users/bob/holiday-requests/446epbc8y7 HTTP/1.1
Host: hr.example.com
Authorization: Bearer <alice-auth-token>
traceparent: 00-28dbeec32e77635cc19bc3204ec56c41-dec5220770f8f4f4-01

{"action":"approve"}
```

</aside>

The application, acting as the <a>PEP</a>, then submits the following HTTP request to the <a>PDP</a>:

<aside class="example" title="HTTP request from the PEP to the PDP">

```http
POST /access/v1/evaluation HTTP/1.1
Host: pdp.example.com
Content-Type: application/json
Authorization: Bearer <pep-auth-token>
traceparent: 00-28dbeec32e77635cc19bc3204ec56c41-893e1b2ac52d712f-01

{
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
}
```

</aside>

The <a>PDP</a> then determines that Alice can't sign on behalf of the company and thus cannot approve the holiday request. It returns the following response:

<aside class="example" title="Response from the PDP to the PEP">

```json
{
    "decision": false,
    "context": {
        "reason": {
            "48": "No signing authority"
        }
    }
}
```

</aside>

A <a>log record</a> as expressed as a JSON object for this scenario:

<aside class="example" title="Log record of denied holiday approval">

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
    }
}
```

</aside>

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

Furthermore, every piece of information used in the evaluation can also be programmatically retrieved, by providing the [`information`](#information) field. This allows full replayability, assuming the engine (PDP) behaves identically or can be manually recreated in the correct state, which is generally achievable.

#### Example 

In the example of the holiday approval, the ability to sign is accessed through the `can_sign` field of the user. The <a>Policy Information Point</a> called `can-sign-api` requests this via an API from the HR application using the request below:

<aside class="example" title="PIP's request to the Managers API">

```http
GET /users/alice?fields=can_sign HTTP/1.1
Host: hr.example.com
traceparent: 00-28dbeec32e77635cc19bc3204ec56c41-836ff5286112f460-01
```

</aside>

And the API returns the following response:

<aside class="example" title="Managers API response to the PIP's request">

```json
{
    "can_sign": false
}
```

</aside>

A log record as expressed as a JSON object for this scenario:

<aside class="example" title="Log record of denied holiday approval including policies and information">

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
    },
    "information": {
        "can-sign-api": {
            "can_sign": false
        }
    }
}
```

</aside>

<p class="note" title="Source references to reduce data duplication">
In this example the entire response is stored in the log record as it is a small response without sensitive data. In most cases it is recommended to use a reference to the data instead. See [[[#source-references]]] for more information.
</p>

### Level 4: Full Environment

In addition to all information used in the evaluation, the environment and configuration of the system that evaluates the decision can also be accurately recreated through the use of [`configuration`](#configuration) field. This provides full, guaranteed replayability and maximum accountability.

<p class="note" title="System boundaries">
The configuration of all components that influence the decision should be included. While this may be limited to the configuration of the PDP, it often also requires configuration of the PIP and sometimes the PAP as well.
</p>

At this level of detail log requests contain the following keys, as defined in [[[#specifications]]]:

#### Example

In the example below we extend the holiday approval request example by describing the version of the language used by the PDP and the configuration of the `can-sign-api` PIP.

<aside class="example" title="Log record of denied holiday approval including policies, information and configuration">

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
    },
    "information": {
        "can-sign-api": {
            "can_sign": false
        }
    },
    "configuration": {
        "opa_version": "1.10.0",
        "can-sign-api": "https://hr.example.com/users/{subject.id}?fields=can_sign"
    }
}
```

</aside>

<p class="note" title="Source references to reduce data duplication">
In this example the configuration is stored in the log record itself. To reduce data duplication it is generally recommended to use a reference to the configuration instead. See [[[#source-references]]] for more information.
</p>

## Implications of levels

The higher the level of detail, the more useful the log is for determining the context of an authorization decision. On the other hand, higher levels of detail also introduce challenges around scalability, technical feasibility, and security.

Conversely, the lowest level of detail may not be sufficient to provide effective accountability. This depends on the data processing which is being authorized and legal requirements for it.

For that reason it's important to decide for different use cases which level of detail is required and appropriate. Aiming for the highest level of detail for all authorization decisions is thus not necessary.
