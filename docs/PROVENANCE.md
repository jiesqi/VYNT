VYNT Provenance

Overview

VYNT Provenance provides a way to record and verify information about content.

Content Hashing

VYNT can generate a SHA-256 hash for content.

A provenance record may contain:

* Content ID
* Content hash
* Metadata hash
* Creator ID
* Source reference
* Timestamp
* Algorithm
* Verification status

Verification

Possible verification states include:

* Verified
* Modified
* Unavailable

Off-Chain Records

The initial provenance system can store verification information off-chain.

Off-chain records should not be represented as blockchain transactions.

Blockchain Architecture

VYNT is designed so a future blockchain provider can support operations such as:

anchorHash()
verifyHash()
getTransaction()

A mock provider can be used during development.

Future Development

Potential blockchain functionality includes:

* Hash anchoring
* Transaction verification
* Public provenance records
* Immutable content references

Blockchain functionality should only be described as active when an actual blockchain integration has been deployed.

© 2026 VYNT Technologies. All rights reserved.
