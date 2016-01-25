import {Component} from 'angular2/core';
import {Item} from './item';

@Component({
  selector: 'dueinator-app',
  template: `<ul class="items">
    <li *ngFor="#item of items">
      {{item.name}}
    </li>
  </ul>`
})
export class AppComponent {
  public items: Item[];

  constructor() {
    // TODO move all this code elsewhere
    var dueTuples = (function() {
      var fs = require('fs');
      var path = require('path');
      var os = require('os');
      var zlib = require('zlib');
      var bplist = require('bplist-parser');
      var plist = require('simple-plist');

      // Get Dropbox folder path. Currently assumes personal, FIXME
      // Future: Don't use synchronous functions
      var dbInfoPath = path.join(os.homedir(), '.dropbox/info.json');
      var dbInfoJson = fs.readFileSync(dbInfoPath);
      var dbInfo = JSON.parse(dbInfoJson);
      var dbPath = dbInfo.personal.path;

      // Get Due file
      var duePath = path.join(dbPath, 'Apps/Due App/Sync.dueappgz');
      var dueGzBuf = fs.readFileSync(duePath);
      var dueBplistBuf = zlib.unzipSync(dueGzBuf);
      var dueBplistObj = bplist.parseBuffer(dueBplistBuf);
      var dueObj = dueBplistObj[0];

      // Convert it to XML so we can use XPath search on it. Takes time.
      var dueXml = plist.stringify(dueObj);
      var dueDoc = new DOMParser().parseFromString(dueXml, 'text/xml');

      // Now look for items. We do this by looking for the status field.
      // (Method from https://gist.github.com/maxjacobson/1b72ae7fe658ca8bd60b)
      var dueNodes: Node[] = [];
      var it = dueDoc.evaluate("//key[text()='status']", dueDoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
      try {
        var thisNode = it.iterateNext();
        while (thisNode) {
          dueNodes.push(thisNode);
          thisNode = it.iterateNext();
        }
      } catch (e) {
        console.log('OH NO');
        throw e;
      }
      var dueTuples: Node[][] = dueNodes.map(function(x) {
        var parent = x.parentNode;
        var sibling1 = parent.nextSibling;
        while (sibling1.nodeName == "#text") {
          sibling1 = sibling1.nextSibling;
        }
        var sibling2 = sibling1.nextSibling;
        while (sibling2.nodeName == "#text") {
          sibling2 = sibling2.nextSibling;
        }
        var tuple = [parent, sibling1, sibling2];
        // This will break if there's more than two <string> siblings FIXME
        if (sibling2.nodeName == "string") {
          var sibling3 = sibling2.nextSibling;
          while (sibling3.nodeName == "#text") {
            sibling3 = sibling3.nextSibling;
          }
          tuple.push(sibling3);
        }
        return tuple;
      });

      return dueTuples;
    })();

    console.log(dueTuples);

    this.items = dueTuples.map(function(x) {
      return { name: x[1].textContent, data: x };
    });
  }
}