'use strict';

const GuildChannel = require('./GuildChannel');
const Collection = require('../util/Collection');
const Permissions = require('../util/Permissions');

/**
 * Represents a guild voice channel on Discord.
 * @extends {GuildChannel}
 */
class VoiceChannel extends GuildChannel {
  _patch(data) {
    super._patch(data);
    /**
     * The bitrate of this voice channel
     * @type {number}
     */
    this.bitrate = data.bitrate;

    /**
     * The maximum amount of users allowed in this channel - 0 means unlimited.
     * @type {number}
     */
    this.userLimit = data.user_limit;
  }

  /**
   * The members in this voice channel
   * @type {Collection<Snowflake, GuildMember>}
   * @readonly
   */
  get members() {
    return this.guild.voiceStates.cache.reduce((members, state) => {
      if (state.channelID === this.id && state.member) {
        members.set(state.id, state.member);
      }
      return members;
    }, new Collection());
  }

  /**
   * Checks if the voice channel is full
   * @type {boolean}
   * @readonly
   */
  get full() {
    return this.userLimit > 0 && this.members.size >= this.userLimit;
  }

  /**
   * Whether the channel is deletable by the client user
   * @type {boolean}
   * @readonly
   */
  get deletable() {
    return super.deletable && this.permissionsFor(this.client.user).has(Permissions.FLAGS.CONNECT);
  }

  /**
   * Whether the channel is editable by the client user
   * @type {boolean}
   * @readonly
   */
  get editable() {
    return this.manageable && this.permissionsFor(this.client.user).has(Permissions.FLAGS.CONNECT);
  }

  /**
   * Whether the channel is joinable by the client user
   * @type {?boolean}
   * @readonly
   */
  get joinable() {
    const { viewable } = this;
    if (!viewable) return viewable === null ? null : false;
    const permissions = this.permissionsFor(this.client.user);
    return (
      permissions.has(Permissions.FLAGS.CONNECT) && (!this.full || permissions.has(Permissions.FLAGS.MOVE_MEMBERS))
    );
  }

  /**
   * Checks if the client has permission to send audio to the voice channel
   * @type {?boolean}
   * @readonly
   */
  get speakable() {
    const permissions = this.permissionsFor(this.client.user);
    return permissions && permissions.has(Permissions.FLAGS.SPEAK);
  }

  /**
   * Sets the bitrate of the channel.
   * @param {number} bitrate The new bitrate
   * @param {string} [reason] Reason for changing the channel's bitrate
   * @returns {Promise<VoiceChannel>}
   * @example
   * // Set the bitrate of a voice channel
   * voiceChannel.setBitrate(48000)
   *   .then(vc => console.log(`Set bitrate to ${vc.bitrate}bps for ${vc.name}`))
   *   .catch(console.error);
   */
  setBitrate(bitrate, reason) {
    return this.edit({ bitrate }, reason);
  }

  /**
   * Sets the user limit of the channel.
   * @param {number} userLimit The new user limit
   * @param {string} [reason] Reason for changing the user limit
   * @returns {Promise<VoiceChannel>}
   * @example
   * // Set the user limit of a voice channel
   * voiceChannel.setUserLimit(42)
   *   .then(vc => console.log(`Set user limit to ${vc.userLimit} for ${vc.name}`))
   *   .catch(console.error);
   */
  setUserLimit(userLimit, reason) {
    return this.edit({ userLimit }, reason);
  }

  /**
   * Attempts to join this voice channel.
   * @returns {Promise<VoiceConnection>}
   * @example
   * // Join a voice channel
   * voiceChannel.join()
   *   .then(connection => console.log('Connected!'))
   *   .catch(console.error);
   */
  join() {
    return this.client.voice.joinChannel(this);
  }

  /**
   * Leaves this voice channel.
   * @example
   * // Leave a voice channel
   * voiceChannel.leave();
   */
  leave() {
    const connection = this.client.voice.connections.get(this.guild.id);
    if (connection?.channel.id === this.id) connection.disconnect();
  }
}

module.exports = VoiceChannel;
