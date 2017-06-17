# myers-diff

Implementation of the longest common subsequence (diff) algorithm.

## Features

* Lightweight (no deps) library of myers diff algorithm.
* Options to ignore whitespace.
* Parse by characters, words, or lines.

## Install

`npm install --save myers-diff`

or

`bower install --save myers-diff`

# API Reference

A javascript test differentiation implementation based on 
[An O(ND) Difference Algorithm and Its Variations (1986)](https://github.com/wickedest/myers-diff/blob/master/www.xmailserver.org/diff2.pdf).
It is a lightweight, no-frills diff API that can be used as a library when building a more
functional higher-level components, such as command-line tools, or diff viewers.

**Example** *(diff and output GNU normal format)*  
```javascript
   const myers = require('myers-diff').default;

   const lhs = 'the quick red fox jumped\nover the hairy dog';
   const rhs = 'the quick brown fox jumped\nover the lazy dog';
   const diff = myers.diff(lhs, rhs, {});
   console.log(myers.formats.GnuNormalFormat(diff));

   //
   // 1,2c1,2
   // < the quick red fox jumped
   // < over the hairy dog
   // ---
   // > the quick brown fox jumped
   // > over the lazy dog
```
**Example** *(using the API)*  
```javascript
   const myers = require('myers-diff').default;

   const lhs = 'the quick red fox jumped\nover the hairy dog';
   const rhs = 'the quick brown fox jumped\nover the lazy dog';
   const diff = myers.diff(lhs, rhs, {});

   for (change of diff) {
       let op;
       if (change.lhs.del === 0 && change.rhs.add > 0) {
           op = 'inserted:';
       } else if (change.lhs.del > 0 && change.rhs.add === 0) {
           op = 'removed:';
       } else {
           op = 'changed:';
       }
       for (let i = change.lhs.at; i < change.lhs.at + change.lhs.del; i++) {
           console.log(op, change.lhs.ctx.getLine(i));
       }
       for (let i = change.rhs.at; i < change.rhs.at + change.rhs.add; i++) {
           console.log(op, change.rhs.ctx.getLine(i));
       }
   }
   // changed: the quick red fox jumped
   // changed: over the hairy dog
   // changed: the quick brown fox jumped
   // changed: over the lazy dog
```
<a name="module_myers.diff"></a>

### myers.diff(lhs, rhs, [options]) ⇒ [<code>Array.&lt;Change&gt;</code>](#module_myers..Change)
Compare `lhs` to `lhs.  Changes are compared from left to right such that items are
deleted from the left, or added to the right, or just otherwise changed between them.

**Kind**: static method of [<code>myers</code>](#module_myers)  
**Returns**: [<code>Array.&lt;Change&gt;</code>](#module_myers..Change) - A list of changes.  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| lhs | <code>string</code> | The left-hand source text. |
| rhs | <code>string</code> | The right-hand source text. |
| [options] | <code>object</code> |  |
| options.compare | <code>string</code> | One of lines (default), words, chars. |
| options.ignoreWhitespace | <code>boolean</code> | Ignores whitespace (default: false). |
| options.splitLinesRegex | <code>string</code> | Splits lines on this regex (default `\n`). |
| options.splitWordsRegex | <code>string</code> | Splits words on this regex (default `[ ]{1}`), |
| options.splitCharsRegex | <code>string</code> | Splits chars on this regex (default ``); |

<a name="module_myers..EncodeContext"></a>

### myers~EncodeContext
Encoder context

**Kind**: inner class of [<code>myers</code>](#module_myers)  

* [~EncodeContext](#module_myers..EncodeContext)
    * [.length](#module_myers..EncodeContext+length) ⇒ <code>number</code>
    * [.getLine(n)](#module_myers..EncodeContext+getLine) ⇒ <code>string</code>

<a name="module_myers..EncodeContext+length"></a>

#### encodeContext.length ⇒ <code>number</code>
Gets number of lines.

**Kind**: instance property of [<code>EncodeContext</code>](#module_myers..EncodeContext)  
**Returns**: <code>number</code> - Number of lines of text.  
<a name="module_myers..EncodeContext+getLine"></a>

#### encodeContext.getLine(n) ⇒ <code>string</code>
Gets a line.

**Kind**: instance method of [<code>EncodeContext</code>](#module_myers..EncodeContext)  
**Returns**: <code>string</code> - Line of text.  

| Param | Type | Description |
| --- | --- | --- |
| n | <code>integer</code> | The line number to get. |

<a name="module_myers..Change"></a>

### myers~Change : <code>object</code>
A change that describes the difference between the left-hand side and right-hand side.

**Kind**: inner typedef of [<code>myers</code>](#module_myers)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| lhs | [<code>ChangeLhs</code>](#module_myers..ChangeLhs) | The left-hand side change. |
| rhs | [<code>ChangeRhs</code>](#module_myers..ChangeRhs) | The right-hand side change. |

<a name="module_myers..ChangeLhs"></a>

### myers~ChangeLhs : <code>object</code>
A left-hand side change.  Interpret the change as follows:

|del|description|
|---|-----------|
|>0|deleted `count` from lhs|
|>0|changed `count` lines|

**Kind**: inner typedef of [<code>myers</code>](#module_myers)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| at | <code>number</code> | The zero-based line index where the change occurred. |
| del | <code>number</code> | The non-negative count of lines that were removed from `at`. |
| ctx | [<code>EncodeContext</code>](#module_myers..EncodeContext) | The encode context. |

<a name="module_myers..ChangeRhs"></a>

### myers~ChangeRhs : <code>object</code>
A right-hand side change.  Interpret the change as follows:

|add|description|
|---|-----------|
|>0|added `count` to rhs|
|>0|changed `count` lines|

**Kind**: inner typedef of [<code>myers</code>](#module_myers)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| at | <code>number</code> | The zero-based line index where the change occurred. |
| add | <code>number</code> | The non-negative count of lines that were added to `at`. |
| ctx | [<code>EncodeContext</code>](#module_myers..EncodeContext) | The encode context. |


# Formats Reference

Output format functions for myers diff.

<a name="module_formats..GnuNormalFormat"></a>

### formats~GnuNormalFormat(change) ⇒ <code>string</code>
Output a `Change` in
[GNU normal format](http://www.gnu.org/software/diffutils/manual/html_node/Example-Normal.html#Example-Normal).

**Kind**: inner method of [<code>formats</code>](#module_formats)  
**Returns**: <code>string</code> - The diff in GNU normal format.  

| Param | Type | Description |
| --- | --- | --- |
| change | [<code>Change</code>](#module_myers..Change) | The change to output. |


## Author

Jamie Peabody <jamie.peabody@gmail.com> 

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
