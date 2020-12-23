'use strict';

const BaseManager = require('./BaseManager');
const { Error } = require('../errors');
const Collection = require('../util/Collection');

/**
 * Manages API methods for users who reacted to a reaction and stores their cache.
 * @extends {BaseManager}
 */
class ReactionUserManager extends BaseManager {
  constructor(client, iterable, reaction) {
    super(client, iterable, { name: 'User' });
    /**
     * The reaction that this manager belongs to
     * @type {MessageReaction}
     */
    this.reaction = reaction;
  }

  /**
   * The cache of this manager
   * @type {Collection<Snowflake, User>}
   * @name ReactionUserManager#cache
   */

  /**
   * Fetches all the users that gave this reaction. Resolves with a collection of users, mapped by their IDs.
   * @param {Object} [options] Options for fetching the users
   * @param {number} [options.limit=100] The maximum amount of users to fetch, defaults to 100
   * @param {Snowflake} [options.before] Limit fetching users to those with an id lower than the supplied id
   * @param {Snowflake} [options.after] Limit fetching users to those with an id greater than the supplied id
   * @returns {Promise<Collection<Snowflake, User>>}
   */
  async fetch({ limit = 100, after, before } = {}) {
    const { emoji, message } = this.reaction;
    const data = await this.client.api
      .channels(message.channel.id)
      .messages(message.id)
      .reactions(emoji.identifier)
      .get({ query: { limit, before, after } });
    return data.reduce((users, rawUser) => {
      const user = this.client.users.add(rawUser);
      this.cache.set(user.id, user);
      return users.set(user.id, user);
    }, new Collection());
  }

  /**
   * Removes a user from this reaction.
   * @param {UserResolvable} [user=this.client.user] The user to remove the reaction of
   * @returns {Promise<MessageReaction>}
   */
  async remove(user = this.client.user) {
    const userID = this.client.users.resolveID(user);
    if (!userID) throw new Error('REACTION_RESOLVE_USER');
    const message = this.reaction.message;
    await this.client.api
      .channels(message.channel.id)
      .messages(message.id)
      .reactions(this.reaction.emoji.identifier, userID === this.client.user.id ? '@me' : userID)
      .delete();
    return this.reaction;
  }
}

module.exports = ReactionUserManager;
