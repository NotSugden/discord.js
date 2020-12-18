'use strict';

const Team = require('./Team');
const Application = require('./interfaces/Application');

/**
 * Represents a Client OAuth2 Application.
 * @extends {Application}
 */
class ClientApplication extends Application {
  _patch(data) {
    super._patch(data);

    /**
     * The app's cover image
     * @type {?string}
     */
    this.cover = data.cover_image || null;

    /**
     * The app's RPC origins, if enabled
     * @type {string[]}
     */
    this.rpcOrigins = data.rpc_origins || [];

    /**
     * If this app's bot requires a code grant when using the OAuth2 flow
     * @type {?boolean}
     */
    this.botRequireCodeGrant = typeof data.bot_require_code_grant !== 'undefined' ? data.bot_require_code_grant : null;

    /**
     * If this app's bot is public
     * @type {?boolean}
     */
    this.botPublic = typeof data.bot_public !== 'undefined' ? data.bot_public : null;

    /**
     * The owner of this OAuth application
     * @name ClientApplication#owner
     * @type {?User|Team}
     */
    if (data.team) this.owner = new Team(this.client, data.team);
    else if (data.owner) this.owner = this.client.users.add(data.owner);
    else this.owner = null;
  }
}

module.exports = ClientApplication;
