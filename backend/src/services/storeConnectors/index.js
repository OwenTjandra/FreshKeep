// Connector registry. Adding a new store integration:
//   1. Create services/storeConnectors/<slug>.js exporting
//      slug, name, integrationType, connect(), sync().
//   2. Import it here and add to the CONNECTORS object.
//   3. Insert a stores row with the matching slug + integration_type
//      (handled by the migration that ships the connector).

import * as costcoMock from './costcoMock.js';

export const CONNECTORS = {
  [costcoMock.slug]: costcoMock,
};

export function getConnector(slug) {
  return CONNECTORS[slug] || null;
}
