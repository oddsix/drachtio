
/**
 * Module dependencies.
 */


/**
 * Expose `Route`.
 */

module.exports = Route;

/**
 * Initialize `Route` with the given SIP `method`, 
 * and an array of `callbacks`.
 *
 * @param {String} method
 * @param {Array} callbacks
 * @api private
 */

function Route(method, callbacks) {
  this.method = method;
  this.callbacks = callbacks;
} 
