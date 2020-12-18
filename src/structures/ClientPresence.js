'use strict';

const { Presence } = require('./Presence');
const { TypeError } = require('../errors');
const { ActivityTypes, OPCodes } = require('../util/Constants');

class ClientPresence extends Presence {
  /**
   * @param {Client} client The instantiating client
   * @param {Object} [data={}] The data for the client presence
   */
  constructor(client, data = {}) {
    super(client, Object.assign(data, { status: data.status || 'online', user: { id: null } }));
  }

  set(presence) {
    const packet = this._parse(presence);
    this.patch(packet);
    if (typeof presence.shardID === 'undefined') {
      this.client.ws.broadcast({ op: OPCodes.STATUS_UPDATE, d: packet });
    } else if (Array.isArray(presence.shardID)) {
      for (const shardID of presence.shardID) {
        this.client.ws.shards.get(shardID).send({ op: OPCodes.STATUS_UPDATE, d: packet });
      }
    } else {
      this.client.ws.shards.get(presence.shardID).send({ op: OPCodes.STATUS_UPDATE, d: packet });
    }
    return this;
  }

  async _parse({ status, since, afk, activity }) {
    const applicationID = activity && (activity.application ? activity.application.id ?? activity.application : null);
    let assets = new Collection();
    if (activity) {
      if (typeof activity.name !== 'string') throw new TypeError('INVALID_TYPE', 'name', 'string');
      if (!activity.type) activity.type = 0;
      if (activity.assets && applicationID) {
        try {
          const a = await this.client.api.oauth2.applications(applicationID).assets.get();
          for (const asset of a) assets.set(asset.name, asset.id);
        } catch {} // eslint-disable-line no-empty
      }
    }

    const packet = {
      afk: afk ?? false,
      since: since ?? null,
      status: status || this.status,
      game: activity
        ? {
            type: activity.type,
            name: activity.name,
            url: activity.url,
            details: activity.details,
            state: activity.state,
            assets: activity.assets
              ? {
                  large_text: activity.assets.largeText,
                  small_text: activity.assets.smallText,
                  large_image: assets.get(activity.assets.largeImage) || activity.assets.largeImage,
                  small_image: assets.get(activity.assets.smallImage) || activity.assets.smallImage,
                }
              : undefined,
            timestamps: activity.timestamps,
            party: activity.party,
            application_id: applicationID,
            secrets: activity.secrets,
            instance: activity.instance,
          }
        : null,
    };
    if (activities === null) {
      data.activities = null;
      return data;
    }
    if (activities && activities.length) {
      for (const [i, activity] of activities.entries()) {
        if (typeof activity.name !== 'string') throw new TypeError('INVALID_TYPE', `activities[${i}].name`, 'string');
        if (!activity.type) activity.type = 0;

        data.activities.push({
          type: typeof activity.type === 'number' ? activity.type : ActivityTypes.indexOf(activity.type),
          name: activity.name,
          url: activity.url,
        });
      }
    } else if ((status || afk || since) && this.activities.length) {
      data.activities.push(...this.activities);
    }

    return data;
  }
}

module.exports = ClientPresence;
