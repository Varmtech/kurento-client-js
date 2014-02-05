/*
 * (C) Copyright 2013 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */

var EventEmitter = require('events').EventEmitter;


/**
 * Represent an instance of a server-side MediaObject
 *
 * @abstract
 * @class   module:KwsMedia~MediaObject
 * @extends external:EventEmitter
 *
 * @param id
 * @param {module:KwsMedia~MediaContainer} parent
 * @param {module:KwsMedia~MediaPipeline} [pipeline]
 * @param {module:KwsMedia~MediaObject.paramsScheme} params
 */
function MediaObject(id, parent, pipeline, params)
{
  var self = this;

  EventEmitter.call(this);

  for(var key in params)
    Object.defineProperty(this, key, {value: params[key]});


  //
  // Subscribe and unsubscribe events on the server when adding and removing
  // event listeners on this MediaObject
  //

  var tokens = {};

  this.on('removeListener', function(event, listener)
  {
    var count = EventEmitter.listenerCount(self, event);

    if(!count)
    {
      var token = tokens[event];

      var params =
      {
        subscription: token
      };

      this.emit('_rpc', 'unsubscribe', params, function(error)
      {
        if(error) return self.emit('error', error);

        delete tokens[event];
      });
    };
  });

  this.on('newListener', function(event, listener)
  {
    if(event == 'release') return;
    if(event == '_rpc')    return;

    var count = EventEmitter.listenerCount(self, event);

    if(!count)
    {
      var params =
      {
        type: event
      };

      this.emit('_rpc', 'subscribe', params, function(error, token)
      {
        if(error) return self.emit('error', error);

        tokens[event] = token;
      });
    };
  });


  //
  // Define object properties
  //

  /**
   * Unique identifier of this object
   *
   * @public
   * @readonly
   * @member {external:Number}
   */
  Object.defineProperty(this, "id", {value : id});

  /**
   * Parent (object that created it) of a MediaObject
   *
   * @public
   * @readonly
   * @member {module:KwsMedia~MediaObject}
   */
  Object.defineProperty(this, "parent", {value : parent});

  /**
   * Pipeline to which this MediaObjects belong
   *
   * If this MediaObject is a pipeline, return itself
   *
   * @public
   * @readonly
   * @member {module:KwsMedia~MediaPipeline}
   */
  Object.defineProperty(this, "pipeline", {value : pipeline || this});


  // Notify that this MediaObject has been created
  parent.emit('mediaObject', this);
};
MediaObject.prototype.__proto__   = EventEmitter.prototype;
MediaObject.prototype.constructor = MediaObject;


/**
 * Explicity release a {@link module:KwsMedia~MediaObject MediaObject} from memory
 *
 * All its descendants will be also released and collected
 *
 * @throws {module:KwsMedia~MediaServerError}
 */
MediaObject.prototype.release = function()
{
  var self = this;

  this.emit('_rpc', 'release', {}, function(error)
  {
    if(error) return console.error(error);

    self.emit('release');

    // Remove events on the object and remove object from cache
    self.removeAllListeners();
  });
};

/**
 * Send a command to a media object
 *
 * @param {external:String} method - Command to be executed by the server
 * @param {module:KwsMedia~MediaObject.paramsScheme} [params] -
 * @callback {createMediaObjectCallback} callback
 *
 * @return {module:KwsMedia~MediaObject} The own media object
 */
MediaObject.prototype.invoke = function(method, params, callback)
{
  // Fix optional parameters
  if(params instanceof Function)
  {
    if(callback)
      throw new SyntaxError("Nothing can be defined after the callback");

    callback = params;
    params = null;
  };

  // Generate request parameters
  var params2 =
  {
    operation: method
  };

  if(params)
    params2.operationParams = params;

  var callback2 = undefined;
  if(callback)
    callback2 = function(error, result)
    {
      if(error) return callback(error);

      callback(null, result.value);
    };

  // Do request
  this.emit('_rpc', 'invoke', params2, callback2);
};


/**
 * @namespace
 */
MediaObject.paramsScheme =
{
  /**
   * @type Boolean
   */
  collectOnUnreferenced:
  {
    type: 'boolean'
  },

  /**
   * @type integer
   */
  garbageCollectorPeriod:
  {
    type: 'integer'
  }
};


/**
 *
 *
 * @callback createMediaObjectCallback
 * @param {MediaServerError} error
 * @param {module:KwsMedia~MediaObject} mediaObject - The created media object child instance
 */


module.exports = MediaObject;