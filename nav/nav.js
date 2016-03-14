module.exports = {
    ping: function() {
        return 'hello';
    },

    /**
    merging 2 series based on tradingDate
    Assuming both are sorted and series1 is longer than series2
    x-x-x-x-x
    y---y---y
    >>
    (x,y)-(x,-)-(x,y)-...
    */
    mergeDate: function(series1, series2) {
      if(series1.length < series2.length) {
        throw "Series 1 must be longer than series 2";
      }
      var result = [];
      var i1 = 0;
      var i2 = 0;
      var dates = {}
      for(var i = 0; i < series1.length; i++) {
          var item = series1[i];
          dates[item.tradeDate] = item;
          dates[item.tradeDate].match = [];
      }

      for (var i = 0; i < series2.length; i++) {
        var currDate = series2[i].tradeDate;
        if(currDate in dates) {
          dates[currDate].match.push(series2[i]);
        }
      }

      for(var i = 0; i < series1.length; i++) {
        result.push(dates[series1[i].tradeDate]);
      }
      return result;
    },

    parsePrice: function(text) {
      return JSON.parse(text).model.highStock.data.map(function(item) {
          // because our price is one day ahead...
          item.timestamp = item.transDate - 86400000;
          return item;
      });
    },

    onlyMatchedOrder: function(text) {
      return this.parseNoti(text).filter(function(item) {
        return item.eventName == 'EXECUTED';
      });
    },

    parseNoti: function(text) {
      return JSON.parse(text).result.map(function(item) {
          item.timestamp = item.transactTime;
          item.quantity = item.matchedQty;
          var side = item.side;
          item.side = side == 1 ? 'BUY' : 'SELL';
          return item;
      });
    },

    prettyDate: function(series) {
      var date;
      return series.map(function(item) {
          var date = new Date(item.timestamp);
          var month = date.getMonth(); if(month < 9) {
            month = '0' + (month + 1);
          }
          var day = date.getDate();
          if(day < 10) {
            day = '0' + day;
          }
          item.tradeDate = date.getFullYear() + '-' + month + '-' + day;
          return item;
      });
    },

    cashFlow: function(series) {
      // calculate from the most recent date
      var balance = 0;
      return series.map(function(item) {
        if(item.noti) {
          var sign = item.noti.side == 1 ? 1 : -1;
          balance += Number(item.noti.price) * Number(item.noti.matchedQty) * sign;
          if(!item.account) {}
          item.balance += balance;
        }
        item.balance = balance;
        return item;
      });
    },

    cashFlowFromStock: function(series) {
      return series.map(function(item) {
        if(!item.account) {item.account = {}}
        if(item.noti) {
          var sign = item.noti.side == 1 ? 1 : -1;
          item.account.balance = Number(item.noti.price) * Number(item.noti.matchedQty) * sign;
        }
        else{
          item.account.balance = 0;
        }
        return item;
      });
    },

    stockValueFlow: function(series) {
      return series.map(item => {
          var sign = item.side == 'BUY' ? 1 : -1;
          item.amount = Number(item.price) * Number(item.quantity) * sign;
          return item;
      });
    },

    /**
      Merging all changes within the same trading date
      Value to merge can be determined by 'func'
    */
    mergeChange: function(series, func) {
      return series.reduce((prev, next) => {
        var last = prev[prev.length - 1];
        if(last) {
          if(last.tradeDate == next.tradeDate) {
            last.value += func(next);
          }
          else{
            prev.push({
              tradeDate: next.tradeDate,
              value: func(next)
            });
          }
        }
        else {
          prev.push({
              tradeDate: next.tradeDate,
              value: func(next)
          })
        }
        return prev;
      }, []);
    },

    /**
    Aggregate all change, give everyday value given a initial value
    */
    aggregateChange: function(series, initial, func) {
      var aggregate = initial;
      return series.map((item) => {
        aggregate += func(item);
        return {
          tradeDate: item.tradeDate,
          value: aggregate
        }
      });
    },

    /** Sum up all buy/sell amount within 1 day **/
    tradeValue: function(dayActivity) {
      return this.stockValueFlow(dayActivity).map(item => {return item.amount}).reduce((a, b) => {return a + b}, 0);
    },

    /** Trade value over a series of trade date **/
    calcTradeValue: function(series) {
        return series.map(item => {
            return {
              tradeDate: item.tradeDate,
              tradeAmount: this.tradeValue(item.match),
            };
        });
    }
}
