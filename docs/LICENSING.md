VYNT Licensing

Overview

VYNT uses subscription-based entitlements and licensing controls for premium functionality.

License System

A VYNT license may be associated with:

* User
* Subscription
* Plan
* License status
* Activation date
* Expiration date
* Verification history

License States

* Pending
* Active
* Suspended
* Expired
* Revoked

Device Activation

Premium licenses may support a configurable number of active devices.

The planned VYNT Pro default is:

3 active devices

Device records may include:

* Device identifier
* Platform
* Device name
* First seen
* Last seen
* Status

License Verification

Premium requests can be verified through a server-side entitlement process.

Authentication
      ↓
Subscription
      ↓
License
      ↓
Device
      ↓
Rate Limit
      ↓
Credits
      ↓
Feature Access

Abuse Prevention

VYNT may detect unusual licensing activity such as:

* Excessive active devices
* Excessive sessions
* Unusual activation patterns
* Abnormal API usage

Potential responses include:

* Re-authentication
* User notification
* Temporary restriction
* Administrative review

These controls are intended to protect subscriptions while minimizing unnecessary data collection.

Security

License secrets should never be exposed through client-side code, public repositories, or application logs.

License keys should be securely generated and stored in hashed form where appropriate.

© 2026 VYNT Technologies. All rights reserved.
