const EOF = Symbol("EOF");
const css = require('css');
const layout = require('./layout');
let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;
let stack = [{
    type:"document",
    children:[]
}];
let rules = [];

function match(element,selector){
    if(element.attributes && element.attributes.length && selector[0] === "#"){
        for(let k = 0; k < element.attributes.length; k++){
            if(element.attributes[k].name === "id" && element.attributes[k].value === selector.slice(1)){
                return true;
            }
        }
    }
    if(element.attributes && element.attributes.length && selector[0] === "."){
        for(let k = 0; k < element.attributes.length; k++){
            if(element.attributes[k].name === "class" && element.attributes[k].value === selector.slice(1)){
                return true;
            }
        }
    }
    if(selector === element.tagName){
        return true;
    }
}

function weightcaculate(selectors){
    var weight = [0,0,0,0];
    if(!selectors.length) return weight;
    selectors.forEach((item) => {
        if(item[0] === "#") weight[1]++;
        else if(item[0] === ".") weight[2]++;
        else weight[3]++;
    });
    return weight;
}

function compareweight(w1,w2){
    if(w1[0] !== w2[0]) return w2[0] > w1[0];
    if(w1[1] !== w2[1]) return w2[1] > w2[1];
    if(w1[2] !== w2[2]) return w2[2] > w2[2];
    if(w1[3] !== w2[3]) return w2[3] > w2[3];
    return true;
}

function computeCss(element){
    var elements = stack.slice().reverse();
    if(!element.computedStyle){
        element.computedStyle = {};
    }
    for(let rule of rules){
        let selectors = rule.selectors[0].split(" ").reverse();
        if(!match(element,selectors[0])){
            continue;
        }
        let i = 1, j = 0;
        while(i < selectors.length && j < elements.length){
            if(match(elements[j++],selectors[i])) i++;
        }
        if(i >= selectors.length){
            var weight = weightcaculate(selectors);
            var computedStyle = element.computedStyle;
            for(let declaration of rule.declarations){
                if(!computedStyle[declaration.property]){
                    computedStyle[declaration.property] = {};
                }
                if(!computedStyle[declaration.property].specificity){
                    computedStyle[declaration.property].specificity = weight;
                    computedStyle[declaration.property].value = declaration.value;
                }else if(compareweight(computedStyle[declaration.property].specificity,weight)){
                    computedStyle[declaration.property].specificity = weight;
                    computedStyle[declaration.property].value = declaration.value;
                }
            }
        }
    }
    //console.log(element.computedStyle);
}

function emit(token){
    let top = stack[stack.length-1];
    if(token.type == "startTag"){

        let element = {
            type:"element",
            tagName:"",
            children:[],
            attributes:[]
        }

        element.tagName = token.tagName;

        for(let key in token){
            if(key !== "type" && key !== "tagName"){
                element.attributes.push({
                    name:key,
                    value:token[key]
                })
            }
        }

        computeCss(element);

        top.children.push(element);

        //element.parent = top;

        if(!token.isSelfClosing){
            stack.push(element);
        }

        currentTextNode = null;
    }else if(token.type == "endTag"){
        if(token.tagName != top.tagName){
            throw new Error("aaa");
        }else {
            if(token.tagName === "style"){
                addCssRules(top.children[0].content);
            }
            layout(top);
            stack.pop();
        }
        currentTextNode = null;
    }else if(token.type == "text"){
        if(currentTextNode === null){
            currentTextNode = {
                type:"text",
                content:""
            }
            top.children.push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }
}

function addCssRules(stylecontent){
    let cssrules = css.parse(stylecontent);
    rules.push(...cssrules.stylesheet.rules);
    //console.log(JSON.stringify(rules,null,4));
}

function data(c){
    if(c == "<"){
        return tagOpen;
    }else if( c == EOF){
        emit({
            type: "EOF"
        });
        return ;
    }else{
        emit({
            type:"text",
            content:c
        });
        return data;
    }
}

function tagOpen(c){
    if(c == "/"){
        return endTagOpen;
    }else if(c.match(/^[a-zA-Z]$/)){
        currentToken = {
            type: "startTag",
            tagName : ""
        }
        return tagName(c);
    }else {
        emit({
            type:"text",
            content:c
        });
        return;
    }
}

function endTagOpen(c){
    if(c.match(/^[a-zA-Z]$/)){
        currentToken = {
            type: "endTag",
            tagName : ""
        }
        return tagName(c);
    }else if(c == ">"){
        emit(currentToken);
        return data;
    }else if(c == EOF){

    }else {

    }
}

function tagName(c){
    if(c.match(/^[\t\n\f ]$/)){
       return beforeAttributeName;
    }else if(c == "/"){
       return selfClosingStartTag;
    }else if(c.match(/^[a-zA-Z]$/)){
        currentToken.tagName += c;
        return tagName;
    }else if(c == ">"){
        emit(currentToken);
        return data;
    }else{
        currentToken.tagName += c;
        return tagName;
    }
}

function selfClosingStartTag(c){
    if(c == ">"){
        currentToken.isSelfClosing = true;
        emit(currentToken);
        return data;
    }else if(c == "EOF"){return;}
    else{return data}
}

//not same
function beforeAttributeName(c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAttributeName;
    }else if(c == ">"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    }else if(c == "/"){
        return selfClosingStartTag;
    }else if(c == "="){
        return beforeAttributeName;
    }else if(c.match(/^[a-zA-Z]$/)){
        currentAttribute = {
            name:"",
            value : ""
        }
        return AttributeName(c);
    }else return beforeAttributeName;
}

function AttributeName(c){
    if(c.match(/^[\t\n\f ]$/)){
        return afterAttributeName;
    }else if(c.match(/^[a-zA-Z]$/)){
        currentAttribute.name += c;
        return AttributeName;
    }else if(c == "="){
        return beforeAttributeValue;
    }else{
        return AttributeName;
    }
}

function afterAttributeName(c){
    if(c.match(/^[\t\n\f ]$/)){
        return afterAttributeName;
    }else if(c == "="){
        return beforeAttributeValue;
    }else if(c == "/"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    }else if(c == ">"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    }else{
        return beforeAttributeName;
    }
}

function beforeAttributeValue(c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAttributeValue;
    }else if(c == "\""){
        return doubleQutAttributeValue;
    }else if(c == "\'"){
        return singleQutAttributeValue;
    }else if(c.match(/^[a-zA-Z]$/)){
        return unQutAttributeValue(c);
    }else return beforeAttributeValue;
}

function doubleQutAttributeValue(c){
    if(c.match(/^[a-zA-Z]$/)){
        currentAttribute.value += c;
        return doubleQutAttributeValue;
    }else if(c == "\""){
        return AfterAttributeValue;
    }else return;
}

function singleQutAttributeValue(c){
    if(c.match(/^[a-zA-Z]$/)){
        currentAttribute.value += c;
        return singleQutAttributeValue;
    }else if(c == "\'"){
        return AfterAttributeValue;
    }else return;
}

function unQutAttributeValue(c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAttributeName;
    }else if(c == ">"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    }else if(c == "/"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    }else if(c.match(/^[a-zA-Z]$/)){
        currentAttribute.value += c;
        return unQutAttributeValue;
    }else{
        return beforeAttributeName;
    }
}

function AfterAttributeValue(c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAttributeName;
    }else if(c == ">"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        return data;
    }else if(c == "/"){
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    }else return beforeAttributeName;
}

module.exports.parseHTML = function parseHTML(html){
    let state = data;
    for(let c of html){
        state = state(c);
    }
    state = state(EOF);
    //console.log(JSON.stringify(stack,null,4));
    return stack[0];
}