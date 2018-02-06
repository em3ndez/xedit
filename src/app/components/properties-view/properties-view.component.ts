import { Component, OnInit } from '@angular/core';
import { EditorService } from '../../services/editor-service/editor.service';
import { File } from '../../models/file';
import { reduce, clone, path, has } from 'ramda';
import { Node } from '../../models/node';
import { EditorComponent } from '../editor/editor.component';
import { XeditMapper } from '../../models/schema/xedit-mapper';

@Component({
  selector: 'app-properties-view',
  templateUrl: './properties-view.component.html',
  styleUrls: ['./properties-view.component.scss']
})
export class PropertiesViewComponent implements OnInit {

  private currentNode: Node;
  private file: File;

  constructor(private _editorService: EditorService) { }

  ngOnInit() {
    this._editorService.getFileState().subscribe(file => {
      this.file = file;
    });
    this._editorService.getCurrentNode().subscribe(currentNode => this.currentNode = currentNode);
  }

  changePropertyValue(evt, property) {

    //Modify file with new changes
    var uuidPath = clone(this.currentNode.getPath())
    var elementContent = this.file.getState().getContent();
    var editContent = reduce(function (acc, value) {
      return acc.child[value];
    }, elementContent[uuidPath.shift()].content, uuidPath);

    const hasAttr = has('attr');

    if (!hasAttr(editContent) || editContent["attr"] == null)
      editContent["attr"] = [];

    editContent["attr"][property] = evt.target.value;

    // Save new state
    var newFile = this._editorService.newStateFile(elementContent);
    this._editorService.setFileState(newFile);

    // Update current node
    this.currentNode.setAttribute(property, evt.target.value);
    this._editorService.setCurrentNode(this.currentNode);
    this._editorService.setCurrentNodeModify(this.currentNode);
  }


  /**
  * Parse JsonNode to EditorNode
  *
  * @param element JsonNode
  * @param path Uuid path
  */
  static parseToNode(element, path) {
    var title = element.tag
    var attributes = element.attr;
    var node = null;
    var uuid = element.uuid;

    try {
      node = new Node(uuid, title, path, attributes);
    } catch (e) {
      console.error("Invalid node");
    }
    return node;
  }

}
