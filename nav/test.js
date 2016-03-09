var expect = require('chai').expect;
var nav = require('./nav.js');
var data = require('./data.js');

describe('Data processing', function() {
    it('parse prices', function() {
        var prices = nav.parsePrice(data.price);
        expect(prices.length).to.above(10);
    });

    it('parse noti', function() {
        var noti = nav.parseNoti(data.noti);
        expect(noti.length).to.above(10);
    });

    it('pretty date', function() {
        var prices = nav.prettyDate(nav.parsePrice(data.price));
        expect(prices[prices.length-1].tradeDate).to.equal('2016-03-03');
    });

    it('matching simple list', function() {
        var series1 = [{tradeDate: '1'}, {tradeDate: '2'}, {tradeDate: '3'}]
        var series2 = [{tradeDate: '1'}, {tradeDate: '2'}, {tradeDate: '2'}]
        var series = nav.mergeDate(series1, series2, function(item1, item2) {return {item1:item1, item2:item2}});
        var only2 = series.filter(function(item) {
            return item.item2
        });
        expect(only2.length).to.equal(series2.length);
    });

    it('match noti & price', function() {
        var prices = nav.prettyDate(nav.parsePrice(data.price));
        var noti = nav.prettyDate(nav.parseMatchedOrder(data.noti));
        var series = nav.mergeDate(prices.reverse(), noti, function(price, noti) {
            return {
                 price: price,
                 noti: noti
            }
        });
        var mergedNoti = series.filter(function(item) {
            return item.noti;
        });
        expect(mergedNoti.length).to.equal(noti.length);

        series.map(function(item) {
             if(item.noti) {
                 expect(item.noti.tradeDate).to.equal(item.price.tradeDate);
             }
        });
    });

    it('cash flow', function() {
        var prices = nav.prettyDate(nav.parsePrice(data.price)).reverse();
        prices = prices.slice(0, 50);
        var noti = nav.prettyDate(nav.parseMatchedOrder(data.noti)).filter(function(item) {
            return item.symbol == 'GTN';
        });
        var series = nav.mergeDate(prices.reverse(), noti, function(price, noti) {
            return {
                 price: price,
                 noti: noti
            }
        });
        series = nav.cashFlowFromStock(series.reverse());
    });

    it('merge change', function() {
        var arr = [
            {tradeDate: '2015-11-17', change: -3},
            {tradeDate: '2015-11-17', change: -2},
            {tradeDate: '2015-11-18', change: 2},
            {tradeDate: '2015-11-18', change: 2},
            {tradeDate: '2015-11-19', change: 1},
        ]
        var result = nav.mergeChange(arr, function(item){return item.change});
        expect(result).to.deep.equal([
            {tradeDate: '2015-11-17', value: -5},
            {tradeDate: '2015-11-18', value: 4},
            {tradeDate: '2015-11-19', value: 1},
        ]);
    });

    it('change aggregate', function() {
        var arr = [
            {tradeDate: '2015-11-17', change: -3},
            {tradeDate: '2015-11-18', change: 2},
            {tradeDate: '2015-11-19', change: 1},
        ]
        var result = nav.aggregateChange(arr, 5, function(item){return item.change});
        expect(result).to.deep.equal([
            {tradeDate: '2015-11-17', value: 2},
            {tradeDate: '2015-11-18', value: 4},
            {tradeDate: '2015-11-19', value: 5},
        ]);
    });

});
