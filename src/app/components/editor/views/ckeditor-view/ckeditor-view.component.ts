import { Component, OnInit, Output, EventEmitter, Input, enableProdMode, OnDestroy } from '@angular/core';
import { is, isNil, equals } from 'ramda';

import { Converters } from '@utils/converters';
import { EditorService } from '@app/services/editor-service/editor.service';
import { XeditMapper } from '@app/models/schema/xedit-mapper';
import Router from '@app/core/mappers/router';
import { Api } from '@app/api';

import { AutoloadModulesService } from '@app/services/autoload-modules-service/autoload-modules.service';
import { XeditNode } from '@app/interfaces/xedit-node';

import { CkeditorComponent } from '@app/elements/xedit/ckeditor/ckeditor.component';
import { ImageComponent } from '@app/elements/xedit/image/image.component';

import { Node } from '@app/models/node';
import { HttpClient } from '@angular/common/http';
import { ClipboardConfigs } from '@app/models/configs/clipboardConfigs';
import { HandlerEditor } from '@app/core/handler-editor/handler-editor';
import { DamService } from '@app/services/dam-service/dam.service';

enableProdMode();

@Component({
    selector: 'app-ckeditor-view',
    templateUrl: './ckeditor-view.component.html',
    styleUrls: ['./ckeditor-view.component.scss']
})
export class CkeditorViewComponent implements OnInit, OnDestroy {

    @Output() selectNode: EventEmitter<string> = new EventEmitter();

    public content: Array<Object>;
    public cssLinks: Array<string>;
    private jsLinks: Array<string>;

    private subscribeFile;
    private subscribeCN;

    private currentNode: Node;

    constructor(private _editorService: EditorService, private _moduleService: AutoloadModulesService, private _damService: DamService, 
        public http: HttpClient) { }

    ngOnInit() {
        // this._moduleService.addModule('container', SectionComponent);
        this._moduleService.addModule('image', ImageComponent);
        this._moduleService.addModule('text', CkeditorComponent);
        this.config();
    }

    ngOnDestroy() {
        this.subscribeFile.unsubscribe();
        this.subscribeCN.unsubscribe();
        this._editorService.setCurrentNode(null);
        this._editorService.setCurrentNodeModify(null);
    }

    /**
     * Config component
     */
    config() {
        // Suscribe to file changes
        this.subscribeFile = this._editorService.getFile().subscribe(file => {
            this.cssLinks = file.getCss();
            this.jsLinks = file.getJs();  
            this.content = this.parseContentToWysiwygEditor(file.getState().getContent());
        });

        this.subscribeCN = this._editorService.getCurrentNode().subscribe(currentNode => {
            if (!isNil(currentNode) && (isNil(this.currentNode) ||
                !equals(currentNode.getAttribute(XeditMapper.TAG_UUID), this.currentNode.getUuid()))) {
                this.currentNode = currentNode;
            }
        });
    }

    changeSelection(uuid: string) {
        this.selectNode.emit(uuid);
    }

    changeContent({ element, content }: {}) {
        const args = {
            node: this.currentNode,
            service: this._editorService,
            clipboardConfigs: new ClipboardConfigs(),
            htpp: this.http,
            getInfo: (selectedId, type, setData, errorCallback, extra) => {
                Api.getInfoNode(this.http, selectedId, type, setData, errorCallback, extra);
            },
            callback: ({ type, setData }) => {
                this._damService.setIsOpen(true);
                this._damService.setOnSelect((item) => {
                    if (!isNil(item)) {
                        Api.getInfoNode(this.http, item.hash, type, setData, null, null);
                        this._damService.setIsOpen(false);
                    }
                });
            }
        }
        HandlerEditor.saveDoc(element, content, args);
    }

    /**
    * Transform json content to html with xedit root tag
    *
    * @param content
    */
    private parseContentToWysiwygEditor(content) {
        let renderContent : Array<Object> = [];
        
        Object.keys(content).forEach(property => {
            const data = is(String, content[property].content) ?
                Converters.html2json(content[property].content) : content[property].content;
            const result = {
                node: property,
                editable: content[property].editable,
                html: ''
            };

            const contentHtml = !result.editable ? Converters.json2html(data, true, true, false, false) : 
                Converters.json2xedit(property, data, this._moduleService, true, true, false, false);

            if (result.editable) {
                console.log(contentHtml);
            }

            result.html = contentHtml;

            renderContent.push(result);

        });
        return renderContent;
    }

    private noEditableArea(json: XeditNode) {
        const html = Converters.json2html(json, true, true, false, false);
        return `<div class="no-editable">${html}</div>`;
    }

    private parseContentToWysiwygEditorWrapper(property, editable, content) {
        const START_TAG = editable ? `<${XeditMapper.TAG_EDITOR} ${XeditMapper.TAG_UUID}="${property}">` : '';
        const END_TAG = editable ? `</${XeditMapper.TAG_EDITOR}>` : '';
        return `${START_TAG}${content}${END_TAG}`;
    }

    private addHttp(resource: string) {
        if (!(/^(f|ht)tps?:\/\//i).test(resource)) {
            resource = Router.configUrl(Api.getResourceUrl(), { id: resource });
        }
        return resource;
    }
}
