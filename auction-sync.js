/**
 * Shared auction state for Auction House (input / final / Auction Day display).
 * Persists to localStorage and syncs across tabs via BroadcastChannel + storage events.
 */
(function (global) {
  var STORAGE_KEY = 'mvAuctionHouseState_v1';
  var CHANNEL_NAME = 'mv-auction-house-sync';

  function defaultState() {
    return {
      address: '',
      beds: '',
      baths: '',
      cars: '',
      propertyType: '',
      landSize: '',
      buildingSize: '',
      description: '',
      price: 0,
      status: '',
      statusAt: 0,
      sold: false,
      passedIn: false
    };
  }

  function clampPrice(n) {
    n = Math.floor(Number(n) || 0);
    if (n < 0) return 0;
    if (n > 99999999) return 99999999;
    return n;
  }

  var bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        var d = defaultState();
        if (o && typeof o === 'object') {
          d.address = String(o.address != null ? o.address : '');
          d.beds = String(o.beds != null ? o.beds : '');
          d.baths = String(o.baths != null ? o.baths : '');
          d.cars = String(o.cars != null ? o.cars : '');
          d.propertyType = String(o.propertyType != null ? o.propertyType : '');
          d.landSize = String(o.landSize != null ? o.landSize : '');
          d.buildingSize = String(o.buildingSize != null ? o.buildingSize : '');
          d.description = String(o.description != null ? o.description : '');
          d.price = clampPrice(o.price);
          d.status = String(o.status != null ? o.status : '');
          d.statusAt = Number(o.statusAt) || 0;
          d.sold = !!o.sold;
          d.passedIn = !!o.passedIn;
        }
        return d;
      }
    } catch (e) {}
    return defaultState();
  }

  function save(state) {
    state.price = clampPrice(state.price);
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    if (bc) {
      try {
        bc.postMessage({ type: 'mvAuction', state: state });
      } catch (e2) {}
    }
    try {
      global.dispatchEvent(new CustomEvent('mvAuctionState', { detail: state }));
    } catch (e3) {}
  }

  function update(partial) {
    var s = load();
    var k;
    for (k in partial) {
      if (Object.prototype.hasOwnProperty.call(partial, k)) {
        s[k] = partial[k];
      }
    }
    if (partial.price != null) s.price = clampPrice(s.price);
    save(s);
    return s;
  }

  function formatCurrencyAUD(amount) {
    var n = clampPrice(amount);
    var parts = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '$' + parts;
  }

  function priceToDigits(price) {
    var p = clampPrice(price);
    var s = String(p);
    while (s.length < 8) s = '0' + s;
    if (s.length > 8) s = s.slice(-8);
    return s.split('').map(function (ch) {
      var d = parseInt(ch, 10);
      return isNaN(d) ? 0 : d;
    });
  }

  function digitsToPrice(digits) {
    if (!digits || digits.length !== 8) return 0;
    var i;
    var s = '';
    for (i = 0; i < 8; i++) {
      var d = Math.max(0, Math.min(9, Math.floor(Number(digits[i]) || 0)));
      s += String(d);
    }
    return clampPrice(parseInt(s, 10) || 0);
  }

  function bumpDigitIndex(price, index, delta) {
    var d = priceToDigits(price);
    if (index < 0 || index > 7) return clampPrice(price);
    d[index] = Math.max(0, Math.min(9, d[index] + delta));
    return digitsToPrice(d);
  }

  function addToPrice(price, add) {
    return clampPrice(clampPrice(price) + Math.floor(Number(add) || 0));
  }

  function listen(callback) {
    function onEvt(ev) {
      callback(ev.detail);
    }
    global.addEventListener('mvAuctionState', onEvt);
    if (bc) {
      bc.onmessage = function (ev) {
        if (ev && ev.data && ev.data.state) callback(ev.data.state);
      };
    }
    global.addEventListener('storage', function (ev) {
      if (ev.key === STORAGE_KEY && ev.newValue) {
        try {
          callback(JSON.parse(ev.newValue));
        } catch (e) {}
      }
    });
    callback(load());
    return function () {
      global.removeEventListener('mvAuctionState', onEvt);
    };
  }

  global.mvAuctionSync = {
    STORAGE_KEY: STORAGE_KEY,
    defaultState: defaultState,
    load: load,
    save: save,
    update: update,
    listen: listen,
    clampPrice: clampPrice,
    formatCurrencyAUD: formatCurrencyAUD,
    priceToDigits: priceToDigits,
    digitsToPrice: digitsToPrice,
    bumpDigitIndex: bumpDigitIndex,
    addToPrice: addToPrice
  };
})(typeof window !== 'undefined' ? window : globalThis);
