'use strict';

const Team = require('./Team');
const Application = require('./interfaces/Application');

/**
 * Represents a Client OAuth2 Application.
 * @extends {Application}
 */
class ClientApplication extends Application {
  constructor(client, data) {
    super(client, data);

    this.owner = null;
    this.rpcOrigins = [];
  }

  _patch(data) {
    super._patch(data);

    /**
     * If this app's bot is public
     * @type {boolean}
     */
    this.botPublic = data.bot_public;

    /**
     * If this app's bot requires a code grant when using the OAuth2 flow
     * @type {boolean}
     */
    this.botRequireCodeGrant = data.bot_require_code_grant;

    /**
     * The app's cover image
     * @type {?string}
     */
    this.cover = data.cover_image;

    if ('rpc_origins' in data) {
      /**
       * The app's RPC origins, if enabled
       * @type {string[]}
       */
      this.rpcOrigins = data.rpc_origins;
    }

    /**
     * The owner of this OAuth application
     * @type {?User|Team}
     */
    this.owner = data.team ? new Team(this.client, data.team) : this.client.users.add(data.owner);
  }
}

module.exports = ClientApplication;
