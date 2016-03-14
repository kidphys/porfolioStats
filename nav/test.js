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


    it('cash flow', function() {
        var prices = nav.prettyDate(nav.parsePrice(data.price)).reverse();
        prices = prices.slice(0, 50);
        var noti = nav.prettyDate(nav.onlyMatchedOrder(data.noti)).filter(function(item) {
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

    it('stock value flow', function() {
        var trades = [
            {side: 'BUY', quantity: 100, price: 10},
            {side: 'SELL', quantity: 100, price: 20},
            {side: 'BUY', quantity: 100, price: 10},
        ];
        var expectResult = [
            {side: 'BUY', quantity: 100, price: 10, amount: 1000},
            {side: 'SELL', quantity: 100, price: 20, amount: -2000},
            {side: 'BUY', quantity: 100, price: 10, amount: 1000},
        ]
        var actual = nav.stockValueFlow(trades);
        expect(actual).to.deep.equal(expectResult);
    });

    it('merge change', function() {
        var arr = [
            {tradeDate: '2015-11-17', change: -3},
            {tradeDate: '2015-11-17', change: -2},
            {tradeDate: '2015-11-18', change: 2},
            {tradeDate: '2015-11-18', change: 2},
            {tradeDate: '2015-11-19', change: 1},
        ]
        var result = nav.mergeChange(arr, item => item.change);
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
        var result = nav.aggregateChange(arr, 5, item => item.change);
        expect(result).to.deep.equal([
            {tradeDate: '2015-11-17', value: 2},
            {tradeDate: '2015-11-18', value: 4},
            {tradeDate: '2015-11-19', value: 5},
        ]);
    });

    it('group trade in to matching date', function() {
        var prices = [
            {tradeDate: '2015-11-17', price: 18},
            {tradeDate: '2015-11-18', price: 19},
            {tradeDate: '2015-11-19', price: 20},
            {tradeDate: '2015-11-20', price: 15},
            {tradeDate: '2015-11-21', price: 16},
        ]
        var trades = [
            {tradeDate: '2015-11-17', side: 'BUY', price: 18, quantity: 100}, 
            {tradeDate: '2015-11-17', side: 'SELL', price: 18, quantity: 100}, 
            {tradeDate: '2015-11-17', side: 'BUY', price: 18, quantity: 100}, 
            {tradeDate: '2015-11-20', side: 'BUY', price: 18, quantity: 100}, 
            {tradeDate: '2015-11-21', side: 'BUY', price: 18, quantity: 100}, 
        ]
        var result = nav.mergeDate(prices, trades);
        for(var i = 0; i < result.length; i++) {
            if(result[i].tradeDate == '2015-11-17') {
                expect(result[i].match).to.deep.equal([
                    {tradeDate: '2015-11-17', side: 'BUY', price: 18, quantity: 100}, 
                    {tradeDate: '2015-11-17', side: 'SELL', price: 18, quantity: 100}, 
                    {tradeDate: '2015-11-17', side: 'BUY', price: 18, quantity: 100}, 
                ]);
            }
        }
    });

    it('from trade activity to cash flow', function() {
        var input = [
            {
                match: [
                    {side: 'BUY', price: 10, quantity: 100}, 
                    {side: 'SELL', price: 10, quantity: 100}, 
                    {side: 'BUY', price: 10, quantity: 100}, 
                ]
            },
            {
                match: [
                    {side: 'BUY', price: 20, quantity: 100}, 
                    {side: 'SELL', price: 20, quantity: 100}, 
                    {side: 'BUY', price: 20, quantity: 100}, 
                ]
            }
        ];
        var output = input.map(item => {
            return {tradeAmount: nav.tradeValue(item.match)};
        });

        var expectResult = [
                {tradeAmount: 1000},
                {tradeAmount: 2000},
            ];
        expect(output).to.deep.equal(expectResult);
    });


    /**
    Just to see if the real data can be processed without any surprise
    */
    it('sanity test match noti & price', function() {
        var prices = nav.prettyDate(nav.parsePrice(data.price));
        var noti = nav.prettyDate(nav.onlyMatchedOrder(data.noti));
        var series = nav.mergeDate(prices.reverse(), noti);
        series = nav.calcTradeValue(series);
        expect(series.length).to.equal(prices.length);
    });

});
