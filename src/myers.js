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
 * @typedef {object} Change
 * @property {module:myers~ChangeLhs} lhs - The left-hand side change.
 * @property {module:myers~ChangeRhs} rhs - The right-hand side change.
 */

/**
 * A left-hand side change.  Interpret the change as follows:
 *
 * |del|description|
 * |---|-----------|
 * |>0|deleted `count` from lhs|
 * |>0|changed `count` lines|
 * @typedef {object} ChangeLhs
 * @property {number} at - The zero-based line index where the change occurred.
 * @property {number} del - The non-negative count of lines that were removed from `at`.
 * @property {module:myers~EncodeContext} ctx - The encode context.
 */

/**
 * A right-hand side change.  Interpret the change as follows:
 *
 * |add|description|
 * |---|-----------|
 * |>0|added `count` to rhs|
 * |>0|changed `count` lines|
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
class Encoder {
    constructor () {
        this.code = 0;
        this.diff_codes = {};
    }

    encode (text, settings) {
        return new EncodeContext(this, text, settings);
    }

    getCode (line) {
        return this.diff_codes[line];
    }

    getCodes () {
        return this.diff_codes;
    }

    newCode(line) {
        this.code = this.code + 1;
        this.diff_codes[line] = this.code;
        return this.code;
    }
}

/**
 * Encoder context
 * @class
 */
class EncodeContext {

    constructor(encoder, text, settings) {
        let lines, re;
        if (text && text.length) {
            if (settings.compare === 'chars') {
                // split all chars
                re = new RegExp(settings.splitCharsRegex, "g");
            }
            else if (settings.compare === 'words') {
                // split all of the text on spaces
                re = new RegExp(settings.splitWordsRegex, "g");
            }
            else { // lines (default)
                re = new RegExp(settings.splitLinesRegex, "g");
            }
            lines = text.split(re);
        }
        else {
            // line is empty
            lines = [];
        }
        this._init(encoder, lines, settings);
    }

    get codes() {
        return this._codes;
    }

    /**
     * Gets number of lines.
     * @return {number} Number of lines of text.
     */
    get length() {
        return Object.keys(this._codes).length;
    }

    get modified() {
        return this._modified;
    }

    /**
     * Gets a line.
     * @param {integer} n - The line number to get.
     * @return {string} Line of text.
     */
    getLine(n) {
        if (!this._codes.hasOwnProperty(n)) {
            return;
        }
        let key, ckey = this._codes[n];
        const keyCodes = this.encoder.getCodes();
        for (key in keyCodes) {
            if (keyCodes.hasOwnProperty(key)) {
                if (keyCodes[key] === ckey) {
                    return key;
                }
            }
        }
    }

    _init(encoder, lines, settings) {
        this.encoder = encoder;
        this._codes = {};
        this._modified = {};

        // for each line, if it exists in 'diff_codes', then 'codes' will
        // be assgined the existing value from 'diff_codes'.  if the line does
        // not existin 'diff_codes', then a new diff_code will be generated 
        // (EncodeContext.code) and stored in 'codes' for the line.
        for (let i = 0; i < lines.length; ++i) {
            let line = lines[i];
            if (settings.ignoreWhitespace) {
                line = line.replace(/\s+/g, '');
            }
            const aCode = encoder.getCode(line);
            if (aCode !== undefined) {
                this._codes[i] = aCode;
            }
            else {
                this._codes[i] = encoder.newCode(line);
            }
        }
    }
}

export default class Myers {
    static compare_lcs(
        lhs_modified, lhs_codes, lhs_codes_length,
        rhs_modified, rhs_codes, rhs_codes_length,
        callback
        ) {
        let lhs_start = 0, rhs_start = 0,
            lhs_line = 0, rhs_line = 0,
            item;

        while (lhs_line < lhs_codes_length || rhs_line < rhs_codes_length) {
            if ((lhs_line < lhs_codes_length) && (!lhs_modified[lhs_line])
                && (rhs_line < rhs_codes_length) && (!rhs_modified[rhs_line])) {
                // equal lines
                lhs_line++;
                rhs_line++;
            }
            else {
                // maybe deleted and/or inserted lines
                lhs_start = lhs_line;
                rhs_start = rhs_line;
                while (lhs_line < lhs_codes_length && (rhs_line >= rhs_codes_length || lhs_modified[lhs_line])) {
                    lhs_line++;
                }
                while (rhs_line < rhs_codes_length && (lhs_line >= lhs_codes_length || rhs_modified[rhs_line])) {
                    rhs_line++;
                }
                if ((lhs_start < lhs_line) || (rhs_start < rhs_line)) {
                    item = {
                        lhs: {
                            at: Math.min(lhs_start, (lhs_codes_length) ? lhs_codes_length - 1 : 0),
                            del: lhs_line - lhs_start
                        },
                        rhs: {
                            at: Math.min(rhs_start, (rhs_codes_length) ? rhs_codes_length - 1 : 0),
                            add: rhs_line - rhs_start
                        }
                    };
                    callback(item);
                }
            }
        }
    }
    static getShortestMiddleSnake(
        lhs_codes, lhs_codes_length, lhs_lower, lhs_upper,
        rhs_codes, rhs_codes_length, rhs_lower, rhs_upper,
        vector_u, vector_d
        ) {
        const max = lhs_codes_length + rhs_codes_length + 1;
        if (max === undefined) {
            throw new Error('unexpected state');
        }
        let kdown = lhs_lower - rhs_lower,
            kup = lhs_upper - rhs_upper,
            delta = (lhs_upper - lhs_lower) - (rhs_upper - rhs_lower),
            odd = (delta & 1) != 0,
            offset_down = max - kdown,
            offset_up = max - kup,
            maxd = ((lhs_upper - lhs_lower + rhs_upper - rhs_lower) / 2) + 1,
            ret = {x:0, y:0}, d, k, x, y;

        vector_d[ offset_down + kdown + 1 ] = lhs_lower;
        vector_u[ offset_up + kup - 1 ] = lhs_upper;
        for (d = 0; d <= maxd; ++d) {
            for (k = kdown - d; k <= kdown + d; k += 2) {
                if (k === kdown - d) {
                    x = vector_d[ offset_down + k + 1 ];//down
                }
                else {
                    x = vector_d[ offset_down + k - 1 ] + 1;//right
                    if ((k < (kdown + d)) && (vector_d[ offset_down + k + 1 ] >= x)) {
                        x = vector_d[ offset_down + k + 1 ];//down
                    }
                }
                y = x - k;
                // find the end of the furthest reaching forward D-path in diagonal k.
                while ((x < lhs_upper) && (y < rhs_upper) && (lhs_codes[x] === rhs_codes[y])) {
                    x++; y++;
                }
                vector_d[ offset_down + k ] = x;
                // overlap ?
                if (odd && (kup - d < k) && (k < kup + d)) {
                    if (vector_u[offset_up + k] <= vector_d[offset_down + k]) {
                        ret.x = vector_d[offset_down + k];
                        ret.y = vector_d[offset_down + k] - k;
                        return (ret);
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
                    if ((k > kup - d) && (vector_u[offset_up + k - 1] < x))
                        x = vector_u[offset_up + k - 1]; // up
                }
                y = x - k;
                while ((x > lhs_lower) && (y > rhs_lower) && (lhs_codes[x - 1] === rhs_codes[y - 1])) {
                    // diagonal
                    x--;
                    y--;
                }
                vector_u[offset_up + k] = x;
                // overlap ?
                if (!odd && (kdown - d <= k) && (k <= kdown + d)) {
                    if (vector_u[offset_up + k] <= vector_d[offset_down + k]) {
                        ret.x = vector_d[offset_down + k];
                        ret.y = vector_d[offset_down + k] - k;
                        return (ret);
                    }
                }
            }
        }
        // should never get to this state
        throw new Error('unexpected state');
    }

    static getLongestCommonSubsequence(
        lhs_modified, lhs_codes, lhs_codes_length, lhs_lower, lhs_upper,
        rhs_modified, rhs_codes, rhs_codes_length, rhs_lower, rhs_upper,
        vector_u, vector_d
        ) {
        // trim off the matching items at the beginning
        while ( (lhs_lower < lhs_upper) && (rhs_lower < rhs_upper) && (lhs_codes[lhs_lower] === rhs_codes[rhs_lower]) ) {
            ++lhs_lower;
            ++rhs_lower;
        }
        // trim off the matching items at the end
        while ( (lhs_lower < lhs_upper) && (rhs_lower < rhs_upper) && (lhs_codes[lhs_upper - 1] === rhs_codes[rhs_upper - 1]) ) {
            --lhs_upper;
            --rhs_upper;
        }
        if (lhs_lower === lhs_upper) {
            while (rhs_lower < rhs_upper) {
                rhs_modified[rhs_lower++] = true;
            }
        }
        else if (rhs_lower === rhs_upper) {
            while (lhs_lower < lhs_upper) {
                lhs_modified[lhs_lower++] = true;
            }
        }
        else {
            const sms = Myers.getShortestMiddleSnake(
                lhs_codes, lhs_codes_length, lhs_lower, lhs_upper,
                rhs_codes, rhs_codes_length, rhs_lower, rhs_upper, 
                vector_u, vector_d);
            Myers.getLongestCommonSubsequence(
                lhs_modified, lhs_codes, lhs_codes_length, lhs_lower, sms.x, 
                rhs_modified, rhs_codes, rhs_codes_length, rhs_lower, sms.y,
                vector_u, vector_d);
            Myers.getLongestCommonSubsequence(
                lhs_modified, lhs_codes, lhs_codes_length, sms.x, lhs_upper,
                rhs_modified, rhs_codes, rhs_codes_length, sms.y, rhs_upper,
                vector_u, vector_d);
        }
    }

    static optimize(ctx) {
        let start = 0, end = 0;
        while (start < ctx._codes.length) {
            while ((start < ctx._codes.length) && (ctx._modified[start] === undefined || ctx._modified[start] === false)) {
                start++;
            }
            end = start;
            while ((end < ctx._codes.length) && (ctx._modified[end] === true)) {
                end++;
            }
            if ((end < ctx._codes.length) && (ctx._codes[start] === ctx._codes[end])) {
                ctx._modified[start] = false;
                ctx._modified[end] = true;
            }
            else {
                start = end;
            }
        }
    }

    static LCS (
        lhsModified, lhsCodes, lhsLength,
        rhsModified, rhsCodes, rhsLength
        ) {
        let vector_u = [], vector_d = [];
        return Myers.getLongestCommonSubsequence(
            lhsModified, lhsCodes, lhsLength, 0, lhsLength,
            rhsModified, rhsCodes, rhsLength, 0, rhsLength,
            vector_u, vector_d);
    }

    static CompareLCS(
        lhsModified, lhsCodes, lhsLength,
        rhsModified, rhsCodes, rhsLength,
        callback
        ) {
        return Myers.compare_lcs(
            lhsModified, lhsCodes, lhsLength,
            rhsModified, rhsCodes, rhsLength,
            callback);
    }

    /**
     * Compare `lhs` to `lhs.  Changes are compared from left to right such that items are
     * deleted from the left, or added to the right, or just otherwise changed between them.
     * 
     * @param   {string} lhs        The left-hand source text.
     * @param   {string} rhs        The right-hand source text.
     * @param   {object} [options]
     * @param   {string} options.compare            One of lines (default), words, chars.
     * @param   {boolean} options.ignoreWhitespace  Ignores whitespace (default: false).
     * @param   {string} options.splitLinesRegex    Splits lines on this regex (default `\n`).
     * @param   {string} options.splitWordsRegex    Splits words on this regex (default `[ ]{1}`),
     * @param   {string} options.splitCharsRegex    Splits chars on this regex (default ``);
     *
     * @return {module:myers~Change[]} A list of changes.
     * @public
     */
    static diff(lhs, rhs, options) {
        const settings = Myers._getDefaultSettings(),
            encoder = new Encoder();

        if (lhs === undefined) {
            throw new Error('illegal argument \'lhs\'');
        }
        if (rhs === undefined) {
            throw new Error('illegal argument \'rhs\'');
        }

        Object.assign(settings, options);

        const lhsCtx = encoder.encode(lhs, settings),
           rhsCtx = encoder.encode(rhs, settings);

        Myers.LCS(
            lhsCtx.modified, lhsCtx.codes, lhsCtx.length,
            rhsCtx.modified, rhsCtx.codes, rhsCtx.length
            );

        Myers.optimize(lhsCtx);
        Myers.optimize(rhsCtx);

        // compare lhs/rhs codes and build a list of comparisons
        let items;
        Myers.CompareLCS(
            lhsCtx.modified, lhsCtx.codes, lhsCtx.length,
            rhsCtx.modified, rhsCtx.codes, rhsCtx.length,
            function (item) {
                // add context information
                item.lhs.ctx = lhsCtx;
                item.rhs.ctx = rhsCtx;
                if (items === undefined) {
                    items = [];
                }
                items.push(item);
            }
        );
        if (items === undefined) {
            return [];
        }
        return items;
    }

    static _getDefaultSettings() {
        return {
            compare: 'lines', // lines|words|chars
            ignoreWhitespace: false,
            splitLinesRegex: '\n',
            splitWordsRegex: '[ ]{1}',
            splitCharsRegex: ''
        }
    }
}
