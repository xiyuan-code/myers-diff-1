'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A javascript test differentiation implementation based on 
 * [An O(ND) Difference Algorithm and Its Variations (1986)](https://github.com/wickedest/myers-diff/blob/master/www.xmailserver.org/diff2.pdf).
 * It is a lightweight, no-frills diff API that can be used as a library when building a more
 * functional higher-level components, such as command-line tools, or diff viewers.
 * @module myers
 * @typicalname myers
 *
 * @example <caption>diff and output GNU normal format</caption>
 * ```javascript
 *    const myers = require('myers-diff').default;
 *
 *    const lhs = 'the quick red fox jumped\nover the hairy dog';
 *    const rhs = 'the quick brown fox jumped\nover the lazy dog';
 *    const diff = myers.diff(lhs, rhs, {});
 *    console.log(myers.formats.GnuNormalFormat(diff));
 *
 *    //
 *    // 1,2c1,2
 *    // < the quick red fox jumped
 *    // < over the hairy dog
 *    // ---
 *    // > the quick brown fox jumped
 *    // > over the lazy dog
 * ```
 * @example <caption>using the API</caption>
 * ```javascript
 *    const myers = require('myers-diff').default;
 *
 *    const lhs = 'the quick red fox jumped\nover the hairy dog';
 *    const rhs = 'the quick brown fox jumped\nover the lazy dog';
 *    const diff = myers.diff(lhs, rhs, {});
 *
 *    for (change of diff) {
 *        let op;
 *        if (change.lhs.del === 0 && change.rhs.add > 0) {
 *            op = 'inserted:';
 *        } else if (change.lhs.del > 0 && change.rhs.add === 0) {
 *            op = 'removed:';
 *        } else {
 *            op = 'changed:';
 *        }
 *        for (let i = change.lhs.at; i < change.lhs.at + change.lhs.del; i++) {
 *            console.log(op, change.lhs.ctx.getLine(i));
 *        }
 *        for (let i = change.rhs.at; i < change.rhs.at + change.rhs.add; i++) {
 *            console.log(op, change.rhs.ctx.getLine(i));
 *        }
 *    }
 *    // changed: the quick red fox jumped
 *    // changed: over the hairy dog
 *    // changed: the quick brown fox jumped
 *    // changed: over the lazy dog
 * ```
 */

/**
 * A change that describes the difference between the left-hand side and right-hand side. 
 * Interpreting a `Change` item is as follows:
 *
 * |del|add|description|
 * |-----|-----|----|
 * |0|>0|added `count` to rhs|
 * |>0|0|deleted `count` from lhs|
 * |>0|>0|changed `count` lines|
 * @typedef {object} Change
 * @property {module:myers~ChangeLhs} lhs - The left-hand side change.
 * @property {module:myers~ChangeRhs} rhs - The right-hand side change.
 */

/**
 * A left-hand side change.
 * @typedef {object} ChangeLhs
 * @property {number} at - The zero-based line index where the change occurred.
 * @property {number} del - The non-negative count of lines that were removed from `at`.
 * @property {module:myers~EncodeContext} ctx - The encode context.
 */

/**
 * A right-hand side change.
 * @typedef {object} ChangeRhs
 * @property {number} at - The zero-based line index where the change occurred.
 * @property {number} add - The non-negative count of lines that were added to `at`.
 * @property {module:myers~EncodeContext} ctx - The encode context.
 */

/**
 * Encodes text into diff-codes to prepare for Myers diff.
 * @class
 * @private
 */
var Encoder = function () {
    function Encoder() {
        _classCallCheck(this, Encoder);

        this.code = 0;
        this.diff_codes = {};
    }

    _createClass(Encoder, [{
        key: 'encode',
        value: function encode(text, settings) {
            return new EncodeContext(this, text, settings);
        }
    }, {
        key: 'getCode',
        value: function getCode(line) {
            return this.diff_codes[line];
        }
    }, {
        key: 'getCodes',
        value: function getCodes() {
            return this.diff_codes;
        }
    }, {
        key: 'newCode',
        value: function newCode(line) {
            this.code = this.code + 1;
            this.diff_codes[line] = this.code;
            return this.code;
        }
    }]);

    return Encoder;
}();

/**
 * Encoder context
 * @class
 */


var EncodeContext = function () {
    function EncodeContext(encoder, text, settings) {
        _classCallCheck(this, EncodeContext);

        var lines = void 0,
            re = void 0;
        if (text && text.length) {
            if (settings.compare === 'chars') {
                // split all chars
                re = new RegExp(settings.splitCharsRegex, "g");
            } else if (settings.compare === 'words') {
                // split all of the text on spaces
                re = new RegExp(settings.splitWordsRegex, "g");
            } else {
                // lines (default)
                re = new RegExp(settings.splitLinesRegex, "g");
            }
            lines = text.split(re);
        } else {
            // line is empty
            lines = [];
        }
        this._init(encoder, lines, settings);
    }

    _createClass(EncodeContext, [{
        key: 'getLine',


        /**
         * Gets a line.
         * @param {integer} n - The line number to get.
         * @return {string} Line of text.
         */
        value: function getLine(n) {
            if (!this._codes.hasOwnProperty(n)) {
                return;
            }
            var key = void 0,
                ckey = this._codes[n];
            var keyCodes = this.encoder.getCodes();
            for (key in keyCodes) {
                if (keyCodes.hasOwnProperty(key)) {
                    if (keyCodes[key] === ckey) {
                        return key;
                    }
                }
            }
        }
    }, {
        key: '_init',
        value: function _init(encoder, lines, settings) {
            this.encoder = encoder;
            this._codes = {};
            this._modified = {};

            // for each line, if it exists in 'diff_codes', then 'codes' will
            // be assgined the existing value from 'diff_codes'.  if the line does
            // not existin 'diff_codes', then a new diff_code will be generated 
            // (EncodeContext.code) and stored in 'codes' for the line.
            for (var i = 0; i < lines.length; ++i) {
                var line = lines[i];
                if (settings.ignoreWhitespace) {
                    line = line.replace(/\s+/g, '');
                }
                var aCode = encoder.getCode(line);
                if (aCode !== undefined) {
                    this._codes[i] = aCode;
                } else {
                    this._codes[i] = encoder.newCode(line);
                }
            }
        }
    }, {
        key: 'codes',
        get: function get() {
            return this._codes;
        }

        /**
         * Gets number of lines.
         * @return {number} Number of lines of text.
         */

    }, {
        key: 'length',
        get: function get() {
            return Object.keys(this._codes).length;
        }
    }, {
        key: 'modified',
        get: function get() {
            return this._modified;
        }
    }]);

    return EncodeContext;
}();

var Myers = function () {
    function Myers() {
        _classCallCheck(this, Myers);
    }

    _createClass(Myers, null, [{
        key: 'compare_lcs',
        value: function compare_lcs(lhs_modified, lhs_codes, lhs_codes_length, rhs_modified, rhs_codes, rhs_codes_length, callback) {
            var lhs_start = 0,
                rhs_start = 0,
                lhs_line = 0,
                rhs_line = 0,
                item = void 0;

            while (lhs_line < lhs_codes_length || rhs_line < rhs_codes_length) {
                if (lhs_line < lhs_codes_length && !lhs_modified[lhs_line] && rhs_line < rhs_codes_length && !rhs_modified[rhs_line]) {
                    // equal lines
                    lhs_line++;
                    rhs_line++;
                } else {
                    // maybe deleted and/or inserted lines
                    lhs_start = lhs_line;
                    rhs_start = rhs_line;
                    while (lhs_line < lhs_codes_length && (rhs_line >= rhs_codes_length || lhs_modified[lhs_line])) {
                        lhs_line++;
                    }
                    while (rhs_line < rhs_codes_length && (lhs_line >= lhs_codes_length || rhs_modified[rhs_line])) {
                        rhs_line++;
                    }
                    if (lhs_start < lhs_line || rhs_start < rhs_line) {
                        item = {
                            lhs: {
                                at: Math.min(lhs_start, lhs_codes_length ? lhs_codes_length - 1 : 0),
                                del: lhs_line - lhs_start
                            },
                            rhs: {
                                at: Math.min(rhs_start, rhs_codes_length ? rhs_codes_length - 1 : 0),
                                add: rhs_line - rhs_start
                            }
                        };
                        callback(item);
                    }
                }
            }
        }
    }, {
        key: 'getShortestMiddleSnake',
        value: function getShortestMiddleSnake(lhs_codes, lhs_codes_length, lhs_lower, lhs_upper, rhs_codes, rhs_codes_length, rhs_lower, rhs_upper, vector_u, vector_d) {
            var max = lhs_codes_length + rhs_codes_length + 1;
            if (max === undefined) {
                throw new Error('unexpected state');
            }
            var kdown = lhs_lower - rhs_lower,
                kup = lhs_upper - rhs_upper,
                delta = lhs_upper - lhs_lower - (rhs_upper - rhs_lower),
                odd = (delta & 1) != 0,
                offset_down = max - kdown,
                offset_up = max - kup,
                maxd = (lhs_upper - lhs_lower + rhs_upper - rhs_lower) / 2 + 1,
                ret = { x: 0, y: 0 },
                d = void 0,
                k = void 0,
                x = void 0,
                y = void 0;

            vector_d[offset_down + kdown + 1] = lhs_lower;
            vector_u[offset_up + kup - 1] = lhs_upper;
            for (d = 0; d <= maxd; ++d) {
                for (k = kdown - d; k <= kdown + d; k += 2) {
                    if (k === kdown - d) {
                        x = vector_d[offset_down + k + 1]; //down
                    } else {
                        x = vector_d[offset_down + k - 1] + 1; //right
                        if (k < kdown + d && vector_d[offset_down + k + 1] >= x) {
                            x = vector_d[offset_down + k + 1]; //down
                        }
                    }
                    y = x - k;
                    // find the end of the furthest reaching forward D-path in diagonal k.
                    while (x < lhs_upper && y < rhs_upper && lhs_codes[x] === rhs_codes[y]) {
                        x++;y++;
                    }
                    vector_d[offset_down + k] = x;
                    // overlap ?
                    if (odd && kup - d < k && k < kup + d) {
                        if (vector_u[offset_up + k] <= vector_d[offset_down + k]) {
                            ret.x = vector_d[offset_down + k];
                            ret.y = vector_d[offset_down + k] - k;
                            return ret;
                        }
                    }
                }
                // Extend the reverse path.
                for (k = kup - d; k <= kup + d; k += 2) {
                    // find the only or better starting point
                    if (k === kup + d) {
                        x = vector_u[offset_up + k - 1]; // up
                    } else {
                        x = vector_u[offset_up + k + 1] - 1; // left
                        if (k > kup - d && vector_u[offset_up + k - 1] < x) x = vector_u[offset_up + k - 1]; // up
                    }
                    y = x - k;
                    while (x > lhs_lower && y > rhs_lower && lhs_codes[x - 1] === rhs_codes[y - 1]) {
                        // diagonal
                        x--;
                        y--;
                    }
                    vector_u[offset_up + k] = x;
                    // overlap ?
                    if (!odd && kdown - d <= k && k <= kdown + d) {
                        if (vector_u[offset_up + k] <= vector_d[offset_down + k]) {
                            ret.x = vector_d[offset_down + k];
                            ret.y = vector_d[offset_down + k] - k;
                            return ret;
                        }
                    }
                }
            }
            // should never get to this state
            throw new Error('unexpected state');
        }
    }, {
        key: 'getLongestCommonSubsequence',
        value: function getLongestCommonSubsequence(lhs_modified, lhs_codes, lhs_codes_length, lhs_lower, lhs_upper, rhs_modified, rhs_codes, rhs_codes_length, rhs_lower, rhs_upper, vector_u, vector_d) {
            // trim off the matching items at the beginning
            while (lhs_lower < lhs_upper && rhs_lower < rhs_upper && lhs_codes[lhs_lower] === rhs_codes[rhs_lower]) {
                ++lhs_lower;
                ++rhs_lower;
            }
            // trim off the matching items at the end
            while (lhs_lower < lhs_upper && rhs_lower < rhs_upper && lhs_codes[lhs_upper - 1] === rhs_codes[rhs_upper - 1]) {
                --lhs_upper;
                --rhs_upper;
            }
            if (lhs_lower === lhs_upper) {
                while (rhs_lower < rhs_upper) {
                    rhs_modified[rhs_lower++] = true;
                }
            } else if (rhs_lower === rhs_upper) {
                while (lhs_lower < lhs_upper) {
                    lhs_modified[lhs_lower++] = true;
                }
            } else {
                var sms = Myers.getShortestMiddleSnake(lhs_codes, lhs_codes_length, lhs_lower, lhs_upper, rhs_codes, rhs_codes_length, rhs_lower, rhs_upper, vector_u, vector_d);
                Myers.getLongestCommonSubsequence(lhs_modified, lhs_codes, lhs_codes_length, lhs_lower, sms.x, rhs_modified, rhs_codes, rhs_codes_length, rhs_lower, sms.y, vector_u, vector_d);
                Myers.getLongestCommonSubsequence(lhs_modified, lhs_codes, lhs_codes_length, sms.x, lhs_upper, rhs_modified, rhs_codes, rhs_codes_length, sms.y, rhs_upper, vector_u, vector_d);
            }
        }
    }, {
        key: 'optimize',
        value: function optimize(ctx) {
            var start = 0,
                end = 0;
            while (start < ctx._codes.length) {
                while (start < ctx._codes.length && (ctx._modified[start] === undefined || ctx._modified[start] === false)) {
                    start++;
                }
                end = start;
                while (end < ctx._codes.length && ctx._modified[end] === true) {
                    end++;
                }
                if (end < ctx._codes.length && ctx._codes[start] === ctx._codes[end]) {
                    ctx._modified[start] = false;
                    ctx._modified[end] = true;
                } else {
                    start = end;
                }
            }
        }
    }, {
        key: 'LCS',
        value: function LCS(lhsModified, lhsCodes, lhsLength, rhsModified, rhsCodes, rhsLength) {
            var vector_u = [],
                vector_d = [];
            return Myers.getLongestCommonSubsequence(lhsModified, lhsCodes, lhsLength, 0, lhsLength, rhsModified, rhsCodes, rhsLength, 0, rhsLength, vector_u, vector_d);
        }
    }, {
        key: 'CompareLCS',
        value: function CompareLCS(lhsModified, lhsCodes, lhsLength, rhsModified, rhsCodes, rhsLength, callback) {
            return Myers.compare_lcs(lhsModified, lhsCodes, lhsLength, rhsModified, rhsCodes, rhsLength, callback);
        }

        /**
         * Compare `lhs` to `lhs.  Changes are compared from left to right such that items are
         * deleted from the left, or added to the right, or just otherwise changed between them.
         * 
         * @param   {string} lhs        The left-hand source text.
         * @param   {string} rhs        The right-hand source text.
         * @param   {object} options
         * @param   {string} options.compare            One of lines (default), words, chars.
         * @param   {boolean} options.ignoreWhitespace  Ignores whitespace (default: false).
         * @param   {string} options.splitLinesRegex    Splits lines on this regex (default `\n`).
         * @param   {string} options.splitWordsRegex    Splits words on this regex (default `[ ]{1}`),
         * @param   {string} options.splitCharsRegex    Splits chars on this regex (default ``);
         *
         * @return {module:myers~Change[]} A list of changes.
         * @public
         */

    }, {
        key: 'diff',
        value: function diff(lhs, rhs, options) {
            var settings = Myers._getDefaultSettings(),
                encoder = new Encoder();

            if (lhs === undefined) {
                throw new Error('illegal argument \'lhs\'');
            }
            if (rhs === undefined) {
                throw new Error('illegal argument \'rhs\'');
            }

            Object.assign(settings, options);

            var lhsCtx = encoder.encode(lhs, settings),
                rhsCtx = encoder.encode(rhs, settings);

            Myers.LCS(lhsCtx.modified, lhsCtx.codes, lhsCtx.length, rhsCtx.modified, rhsCtx.codes, rhsCtx.length);

            Myers.optimize(lhsCtx);
            Myers.optimize(rhsCtx);

            // compare lhs/rhs codes and build a list of comparisons
            var items = void 0;
            Myers.CompareLCS(lhsCtx.modified, lhsCtx.codes, lhsCtx.length, rhsCtx.modified, rhsCtx.codes, rhsCtx.length, function (item) {
                // add context information
                item.lhs.ctx = lhsCtx;
                item.rhs.ctx = rhsCtx;
                if (items === undefined) {
                    items = [];
                }
                items.push(item);
            });
            if (items === undefined) {
                return [];
            }
            return items;
        }
    }, {
        key: '_getDefaultSettings',
        value: function _getDefaultSettings() {
            return {
                compare: 'lines', // lines|words|chars
                ignoreWhitespace: false,
                splitLinesRegex: '\n',
                splitWordsRegex: '[ ]{1}',
                splitCharsRegex: ''
            };
        }
    }]);

    return Myers;
}();

exports.default = Myers;