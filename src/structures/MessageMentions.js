'use strict';

const Collection = require('../util/Collection');
const { ChannelTypes } = require('../util/Constants');
const Util = require('../util/Util');

/**
 * Keeps track of mentions in a {@link Message}.
 */
class MessageMentions {
  constructor(message, users, roles, everyone, crosspostedChannels) {
    /**
     * The client the message is from
     * @type {Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: message.client });

    /**
     * The guild the message is in
     * @type {?Guild}
     * @readonly
     */
    Object.defineProperty(this, 'guild', { value: message.guild });

    /**
     * The initial message content
     * @type {string}
     * @readonly
     * @private
     */
    Object.defineProperty(this, '_content', { value: message.content });

    /**
     * Whether `@everyone` or `@here` were mentioned
     * @type {boolean}
     */
    this.everyone = Boolean(everyone);

    if (users) {
      if (users instanceof Collection) {
        /**
         * Any users that were mentioned
         * <info>Order as received from the API, not as they appear in the message content</info>
         * @type {Collection<Snowflake, User>}
         */
        this.users = new Collection(users);
      } else {
        this.users = users.reduce((collection, user) => {
          if (user.member && this.guild) {
            this.guild.members.add(Object.assign(user.member, { user }));
          }
          return collection.set(user.id, this.client.users.add(user));
        }, new Collection());
      }
    } else {
      this.users = new Collection();
    }

    if (roles) {
      if (roles instanceof Collection) {
        /**
         * Any roles that were mentioned
         * <info>Order as received from the API, not as they appear in the message content</info>
         * @type {Collection<Snowflake, Role>}
         */
        this.roles = new Collection(roles);
      } else {
        this.roles = roles.reduce((collection, id) => {
          const role = this.guild.roles.cache.get(id);
          if (role) collection.set(role.id, role);
          return collection;
        }, new Collection());
      }
    } else {
      this.roles = new Collection();
    }

    /**
     * Cached members for {@link MessageMentions#members}
     * @type {?Collection<Snowflake, GuildMember>}
     * @private
     */
    this._members = null;

    /**
     * Cached channels for {@link MessageMentions#channels}
     * @type {?Collection<Snowflake, GuildChannel>}
     * @private
     */
    this._channels = null;

    /**
     * Crossposted channel data.
     * @typedef {Object} CrosspostedChannel
     * @property {string} channelID ID of the mentioned channel
     * @property {string} guildID ID of the guild that has the channel
     * @property {string} type Type of the channel
     * @property {string} name The name of the channel
     */

    if (crosspostedChannels) {
      if (crosspostedChannels instanceof Collection) {
        /**
         * A collection of crossposted channels
         * <info>Order as received from the API, not as they appear in the message content</info>
         * @type {Collection<Snowflake, CrosspostedChannel>}
         */
        this.crosspostedChannels = new Collection(crosspostedChannels);
      } else {
        const channelTypes = Object.keys(ChannelTypes);
        this.crosspostedChannels = crosspostedChannels.reduce((collection, data) => {
          const type = channelTypes[data.type];
          return collection.set(data.id, {
            channelID: data.id,
            guildID: data.guild_id,
            type: type ? type.toLowerCase() : 'unknown',
            name: data.name,
          });
        }, new Collection());
      }
    } else {
      this.crosspostedChannels = new Collection();
    }
  }

  /**
   * Any members that were mentioned (only in {@link TextChannel}s)
   * <info>Order as received from the API, not as they appear in the message content</info>
   * @type {?Collection<Snowflake, GuildMember>}
   * @readonly
   */
  get members() {
    if (this._members) return this._members;
    if (!this.guild) return null;
    return this.users.reduce((members, user) => {
      const member = this.guild.members.resolve(user);
      if (member) members.set(member.id, member);
      return members;
    }, (this._members = new Collection()));
  }

  /**
   * Any channels that were mentioned
   * <info>Order as they appear first in the message content</info>
   * @type {Collection<Snowflake, GuildChannel>}
   * @readonly
   */
  get channels() {
    if (this._channels) return this._channels;
    this._channels = new Collection();
    let matches;
    while ((matches = this.constructor.CHANNELS_PATTERN.exec(this._content)) !== null) {
      const chan = this.client.channels.cache.get(matches[1]);
      if (chan) this._channels.set(chan.id, chan);
    }
    return this._channels;
  }

  /**
   * Checks if a user, guild member, role, or channel is mentioned.
   * Takes into account user mentions, role mentions, and @everyone/@here mentions.
   * @param {UserResolvable|RoleResolvable|GuildChannelResolvable} data User/Role/Channel to check
   * @param {Object} [options] Options
   * @param {boolean} [options.ignoreDirect=false] - Whether to ignore direct mentions to the item
   * @param {boolean} [options.ignoreRoles=false] - Whether to ignore role mentions to a guild member
   * @param {boolean} [options.ignoreEveryone=false] - Whether to ignore everyone/here mentions
   * @returns {boolean}
   */
  has(data, { ignoreDirect = false, ignoreRoles = false, ignoreEveryone = false } = {}) {
    if (!ignoreEveryone && this.everyone) return true;
    const GuildMember = require('./GuildMember');
    if (!ignoreRoles && data instanceof GuildMember && this.roles.some(role => data.roles.cache.has(role.id))) {
      return true;
    }

    if (!ignoreDirect) {
      const id =
        this.client.users.resolveID(data) || this.guild?.roles.resolveID(data) || this.client.channels.resolveID(data);

      return this.users.has(id) || this.channels.has(id) || this.roles.has(id);
    }

    return false;
  }

  toJSON() {
    return Util.flatten(this, {
      members: true,
      channels: true,
    });
  }
}

/**
 * Regular expression that globally matches `@everyone` and `@here`
 * @type {RegExp}
 */
MessageMentions.EVERYONE_PATTERN = /@(everyone|here)/g;

/**
 * Regular expression that globally matches user mentions like `<@81440962496172032>`
 * @type {RegExp}
 */
MessageMentions.USERS_PATTERN = /<@!?(\d{17,19})>/g;

/**
 * Regular expression that globally matches role mentions like `<@&297577916114403338>`
 * @type {RegExp}
 */
MessageMentions.ROLES_PATTERN = /<@&(\d{17,19})>/g;

/**
 * Regular expression that globally matches channel mentions like `<#222079895583457280>`
 * @type {RegExp}
 */
MessageMentions.CHANNELS_PATTERN = /<#(\d{17,19})>/g;

module.exports = MessageMentions;
