/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


(function (self) {
  'use strict';

  // On install, cache resources and skip waiting so the worker won't
  // wait for clients to be closed before becoming active.
  self.addEventListener('install', function (event) {
    event.waitUntil(oghliner.cacheResources().then(function () {
      return self.skipWaiting();
    }));
  });

  // On activation, delete old caches and start controlling the clients
  // without waiting for them to reload.
  self.addEventListener('activate', function (event) {
    event.waitUntil(oghliner.clearOtherCaches().then(function () {
      return self.clients.claim();
    }));
  });

  // Retrieves the request following oghliner strategy.
  self.addEventListener('fetch', function (event) {
    if (event.request.method === 'GET') {
      event.respondWith(oghliner.get(event.request));
    } else {
      event.respondWith(self.fetch(event.request));
    }
  });

  var oghliner = self.oghliner = {

    // This is the unique prefix for all the caches controlled by this worker.
    CACHE_PREFIX: 'offline-cache:mozilla/platatus:' + (self.registration ? self.registration.scope : '') + ':',

    // This is the unique name for the cache controlled by this version of the worker.
    get CACHE_NAME() {
      return this.CACHE_PREFIX + 'ff06383ece0cda5ed23a940c45fc8b1431479177';
    },

    // This is a list of resources that will be cached.
    RESOURCES: [
      './', // cache always the current root to make the default page available
      './index.html', // 2212eac63a4f979162251b37afa5ab3a267c1001
      './bundle.js', // ff027cd680c008da02bb2655ca03815e103afd72
      './bundle.css', // 620b82d9485ba8995cd7c0c409720022d6a706a1
      './images/bugzilla.png', // 7269f42f62bfefd436523107e9d793febb847a2d
      './images/bugzilla@2x.png', // 20c03b5250a11cd9b49319f73c09ae3590be3682
      './images/favicon-192.png', // d891f6fc4fd6cf1583b5ae9d4b82cc5dfaec6b15
      './images/favicon-196.png', // 32d40cdb775cd8314a56b4e0b36778f599ef6e48
      './images/github.png', // 98e1ec309af678d7805ad554604a6d2ec2cdf8de
      './images/github@2x.png', // 641191632cd62f1aa8569e8ed4e257ab820f28dc
      './images/html5.png', // 86c7982cd62f36a04ab35578e983093ee07fa85f
      './images/html5@2x.png', // bcb258002ae0d4b333e6fee384d6ff7e8bfcbe56
      './images/ios-icon-180.png', // 7f66637947169539107bd9c999209e714533b5b7
      './images/mdn.png', // a26a173bd58c9ecdaa7fe393b31cc7e58be2263e
      './images/mdn@2x.png', // 15f4d6678de9e5c896559f334ea4c2e4928e862f
      './images/tabzilla-static-high-res.png', // b61a9911763194807cdd009d9772d8f74d9219f4
      './images/tabzilla-static.png', // daf1c7682b6197942b1c82b0790f57bf9605a13c

    ],

    // Adds the resources to the cache controlled by this worker.
    cacheResources: function () {
      var now = Date.now();
      var baseUrl = self.location;
      return this.prepareCache()
      .then(function (cache) {
        return Promise.all(this.RESOURCES.map(function (resource) {
          // Bust the request to get a fresh response
          var url = new URL(resource, baseUrl);
          var bustParameter = (url.search ? '&' : '') + '__bust=' + now;
          var bustedUrl = new URL(url.toString());
          bustedUrl.search += bustParameter;

          // But cache the response for the original request
          var requestConfig = { credentials: 'same-origin' };
          var originalRequest = new Request(url.toString(), requestConfig);
          var bustedRequest = new Request(bustedUrl.toString(), requestConfig);
          return fetch(bustedRequest).then(function (response) {
            if (response.ok) {
              return cache.put(originalRequest, response);
            }
            console.error('Error fetching ' + url + ', status was ' + response.status);
          });
        }));
      }.bind(this));
    },

    // Remove the offline caches not controlled by this worker.
    clearOtherCaches: function () {
      var deleteIfNotCurrent = function (cacheName) {
        if (cacheName.indexOf(this.CACHE_PREFIX) !== 0 || cacheName === this.CACHE_NAME) {
          return Promise.resolve();
        }
        return self.caches.delete(cacheName);
      }.bind(self);

      return self.caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames.map(deleteIfNotCurrent));
      });

    },

    // Get a response from the current offline cache or from the network.
    get: function (request) {
      return this.openCache()
      .then(function (cache) {
        return cache.match(request);
      })
      .then(function (response) {
        if (response) {
          return response;
        }
        return self.fetch(request);
      });
    },

    // Prepare the cache for installation, deleting it before if it already exists.
    prepareCache: function () {
      return self.caches.delete(this.CACHE_NAME).then(this.openCache.bind(this));
    },

    // Open and cache the offline cache promise to improve the performance when
    // serving from the offline-cache.
    openCache: function () {
      if (!this._cache) {
        this._cache = self.caches.open(this.CACHE_NAME);
      }
      return this._cache;
    }

  };
}(self));
