
/**
 * 命名大意：
 * dom    用户定义承载树的dom
 * html   树的html
 * item   data的每一条,可以是node也可以是child
 * child  树的叶子;子元素;成员
 * node   树的节点;文件夹;部门
 * layer  树的层级,包含同一层的item(node,child);
 * _      带有下划线的是插件需要的方法属性，用户不需要使用
 *
 * 思路:
 * 1.node的id和child的id可以重复,因为实际场景可能是两种数据比如,部门和人员.对于省份和城市可能本身就不会重复
 * 2.选择数据,用户需要的结果是:1.所有child.2.node+child
 * 3.is_trigger如果是true,是为input框设计的,会去读取input框的宽度作为自身的宽度
 * 4.这里html的input显示的时候根据data决定是否check，
 * 5.每次的点击input产生的变化是html变了，然后data也变。
 * 6.4，5导致容易出错,但我觉得应该是根据操作data数据发生变化，变化完毕，统一一个方法决定html结构的变化，不过效率不一定更高
 * 7.only_child为true必然不会node_merge
 * 8.代码中还有一些根据标签(div,span)来做的判断,都不太靠谱
 *
 * 9.现在的 child 指的是树的叶子，与‘子成员’概念并不一致，是否需要改为 leaf 或者其他？
 * 10. 8的问题是否可以用 class 来解决？ 同样的还有 js 直接操作样式的代码块，是否都可以用class来代替
 */

;(function ($) {

    window.xTreePrototype=function(opt){
        return new Tree(opt);
    };


    var defOpt = {
        dom:'',  //jqueryDom
        is_trigger:true,  //是否需要触发? 否则直接显示
        has_search:false,
        only_child:true,//是否结果只要 child  
        node_merge:true,//结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
        zIndex:1,
        choose:false,  //哪些是选中的？优先级高于data  {nodeId:[1,2,3],id:[1,2,3]}
        //node_first:false,//是否需要节点排在前面  否则按照data的顺序
        is_multi:true,//是否多选
        expand:false, //是否展开，false、true、num  //todo expand
        rootId:0,//todo  如何去掉这个参数
        width:null,
        maxHeight:null,
        data:[],//{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
        onInit: function () {},
        onOpen: function () {}, //触发时
        onBeforeOpen: function () {},
        onClose: function (has_chg) {
            //has_chg  是否发生变化
        },
        onCheck: function (item,dom,childrenItem) {
            //item 点击的item
            //dom 点击的dom
            //childrenItem  所有影响的子节点
        },
        onCancel: function (item,dom,childrenItem) {}
    };

    var Tree=function(opt){
        this._init(opt);
        return this;
    };

    /**
     * @var opt  用户传进来的option
     * @var dom 打开tree的载体jquery dom
     * @var data  做tree的data
     * @var html tree的html
     */

    Tree.prototype=(function(){
        console.log(this);
        console.log(this._init);
        this._init(opt);
        // 初始化
        function _init(opt){
            this.opt = $.extend(true,{},defOpt,opt);
            this.dom = this.opt.dom;
            this.data = this.opt.data;
            this.html = this._makePanel();

            var res = checkData(this.data);
            if(!res){
                return false;
            }

            this.opt.onInit();
            this._is_open=false;
            var that=this;
            if(this.opt.choose) {
                var choose=this.opt.choose;
                $.each(choose.nodeId,function (i,n){
                    var item={};
                    $.each(that.data,function(i2,n2){
                        if(n2.id == n  &&  n2.is_node == 1){
                            item=n2;
                            item.is_check=true;
                        }
                    });
                    that._chgAllChildren(item.id,item.is_check);
                });
                $.each(choose.id,function (i,n){
                    $.each(that.data,function(i2,n2){
                        if(n2.id == n && n2.is_node == false){
                            n2.is_check=true;
                        }
                    });
                });
            }

            this._originId=this.getId();


            if(this.opt.is_trigger){
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    that.start();
                    e.stopPropagation();
                });

                $(document).on('click.xTree', function () {
                    that.end();
                });
            }
        }


        /**
         *      方法
         *
         */
        function start(){
            this.opt.onBeforeOpen();
            this._showPanel();
            this._showData();
//                this._expand();
            this._is_open=true;

            this.html.find('.x-tree-search').focus();
            this.opt.onOpen();
            return this;
        }
        function end (){
            if(this._is_open){
                this.html.hide();
                this.dom.val(this.getName());
                var ids=this.getId();
                this._is_first=false;

                this._is_open=false;
                this.opt.onClose(JSON.stringify(ids) !== JSON.stringify(this._originId));
                this._originId=ids;
            }
        }
        function getName(){
            var text=[];
            var data=this.data;
            if(this.opt.only_leaf){
                $.each(data,function(i,n){
                    if(n.is_check && !n.is_node){
                        text.push( n.name);
                    }
                });
            }else{
                //todo  这里判断 node_merge
                var node=[];
                $.each(data,function(i,n){
                    if(n.is_check && n.is_node){
                        node.push( n.id);
//                            text.push( n.name);  //nodefirst
                    }
                });

                var clone= $.extend(true,[],data);
                $.each(clone,function(i,n){
                    if(    (n.is_check  &&  $.inArray(n.nodeId,node) != -1) || !n.is_check  ){
                        clone[i]=null;
                    }
                });

                $.each(clone,function(i,n){
                    if(n){
                        text.push( n.name);
                    }
                });

            }

            return text.join();
        }
        function getId(){
            var id=[];
            var nodeId=[];
            var data=this.data;

            if(this.opt.only_leaf){
                $.each(data,function(i,n){
                    if(n.is_check && !n.is_node){
                        id.push( data[i].id);
                    }
                });

            }else{

                if(this.opt.node_merge){
                    var node=[];
                    $.each(data,function(i,n){
                        if(n.is_check && n.is_node){
                            node.push( n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone= $.extend(true,[],data);
                    $.each(clone,function(i,n){
                        if(    (n.is_check  &&  $.inArray(n.nodeId,node) != -1) || !n.is_check  ){
                            clone[i]=null;
                        }
                    });


                    $.each(clone,function(i,n){
                        if(n){
                            if(n.is_node){
                                nodeId.push( data[i].id);
                            }else{
                                id.push( data[i].id);
                            }
                        }
                    });
                }else{
                    $.each(data,function(i,n){
                        if(n.is_check){
                            if(n.is_node){
                                nodeId.push( data[i].id);
                            }else{
                                id.push( data[i].id);
                            }
                        }
                    });
                }



                id={'id':id,'nodeId':nodeId};
            }
            return id;
        }
        function cancelItem(id,type){
            var item={};
            var dom=this.html.find('input[data-isNode="'+parseInt(type)+'"][data-id="'+id+'"]').prop('checked',false);
            $.each(this.data,function(i,n){
                if(n.id ==id  &&  n.is_node == type){
                    item=n;
                    item.is_check=false;
                }
            });

            this._chgItem(item,dom);

        }
        function cancelAll(){
            $.each(this.data,function(index,item){
                item.is_check = false;
            });
            this.html.find('input').prop("checked",false);
            this.opt.onCancel();
        }
        function checkItem(id,type){
            var item={};
            var dom=this.html.find('input[data-isNode="'+parseInt(type)+'"][data-i="'+id+'"]').prop('checked',true);
            $.each(this.data,function(i,n){
                if(n.id ==id  &&  n.is_node == type){
                    item=n;
                    item.is_check=true;
                }
            });

            this._chgItem(item,dom);

        }
        function checkAll() {
            if(this.opt.is_multi){
                $.each(this.data,function(index,item){
                    item.is_check = true;
                });
                this.html.find('input').prop("checked",true);
                this.opt.onCheck();
            }
        }
        function getItem(){
            var arr=[];
            var data=this.data;
            if(this.opt.only_leaf) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        arr.push(n);
                    }
                });
            }else{

                if(this.opt.node_merge){
                    var node=[];
                    $.each(data,function(i,n){
                        if(n.is_check && n.is_node){
                            node.push( n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone= $.extend(true,[],data);
                    $.each(clone,function(i,n){
                        if(    (n.is_check  &&  $.inArray(n.nodeId,node) != -1) || !n.is_check  ){
                            clone[i]=null;
                        }
                    });


                    $.each(clone,function(i,n){
                        if(n){
                            arr.push( n);
                        }
                    });
                }else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            arr.push(n);
                        }
                    });
                }


            }
            return arr;
        }
        function search(val){
            this._removeLayer(this.opt.rootId);

            if(val===''){
                this.html.find('div[node-id="'+this.opt.rootId+'"]').remove();
                this._showLayer(this.opt.rootId);
            }else{
                for(var i in this.data){
                    if(  !this.data[i].is_node &&   this.data[i].name.indexOf(val) != -1){
                        this.html.find('div[node-id="'+this.opt.rootId+'"]').append(this._makeItem(this.data[i]));
                    }
                }
            }
        }


        /**
         *      视图方法
         */
        function _showPanel(){
            if(this.opt.is_trigger){
                this.html.css({
                    top:this.dom.position().top+this.dom.outerHeight(),
                    left:this.dom.position().left,
                    minWidth:this.opt.width?this.opt.width:this.dom.outerWidth()
                });

                this.html.on('click', function (e) {
                    e.stopPropagation();
                });

                this.dom.after(this.html);

            }else{
                this.dom.append(this.html);
            }

        }
        function _showData(){
            if( this._is_first ){
                this._showLayer(this.opt.rootId);
            }else{
                this.html.show();
            }

        }
        function _expand(){
            var obj = this;
            if(obj.opt.expand === true){
                $.each(obj.data,function(index,item){
                    if(item.is_node){
                        obj.html.find('div[node-id="'+item.id+'"] span[data-icon="expand"]').click();
                    }
                });
            }else if(obj.opt.expand){
                var expandId = obj.opt.rootId;
                for (var i = 0; i < obj.opt.expand; i++) {
                    expandId = obj._expandLevel(expandId);
                }
            }
        }
        function _expandLevel(id){
            var obj = this;
            var expandId = [];
            $.each(id,function(index,item){
                $.each(obj.data,function(index2,item2){
                    if(item2.nodeId===item){
                        expandId.push(item2.id);
                        obj.html.find('div[node-id="'+item2.id+'"] span[data-icon="expand"]').click();
                    }
                });
            });
            return expandId;
        }
        function _showLayer(layerId){
            var showData=this._getLayerData(layerId);
            var itemDiv=makeLayer();


            //这里 0节点的结构 和 子节点的结构 没有处理好    以后尽量让node-id 和  itemdiv 分开
            if(layerId === this.opt.rootId){
                itemDiv=$(itemDiv).attr('node-id',this.opt.rootId);
                this.html.append(itemDiv);
                //itemDiv.parent().attr('node-id',0);

            }else{
                toShrink(this.html.find('div[node-id="'+layerId+'"] i'));
                this.html.find('div[node-id="'+layerId+'"]').append(itemDiv);
            }

            for(var i in showData){
                itemDiv.append(this._makeItem(showData[i]));
            }
        }
        function _removeLayer(layerId){
            this.html.find('div[node-id="'+layerId+'"]>div').remove();
            toExpand(this.html.find('div[node-id="'+layerId+'"] i'));
        }


        /**
         *      数据方法
         */
        function _getLayerData(parent){
            var res=[];
            for(var i in this.data){
                if(this.data[i].nodeId==parent){
//                if(data[i].is_node){
//                    res.unshift(data[i])
//                }else{
//                    res.push(data[i]);
//                }

                    res.push(this.data[i]);  //原序
                }
            }
            return res;
        }
        function _chgItem(item,dom){

            if(this.opt.is_multi){
                if(item.is_node){
                    dom.parent().find('input').prop('checked',item.is_check);
                    this._chgAllChildren(item.id,item.is_check);
                }

                if(!item.is_check){
                    this._cancelParentNode(item.nodeId);
                }else{
                    this._checkParentNode(item.nodeId);
                }
            }else{
//                    this.html.find('input').prop("checked",false);
//                    $(this).prop('checked',true);
            }


            var  childItem=[];
            this._getChild(item,childItem);


            if(!item.is_check){
                this.opt.onCancel(item,dom,childItem);

            }else{
                this.opt.onCheck(item,dom,childItem);
            }


        }
        function _getChild(node,cont) {
            if(node.is_node){
                var that=this;
                $.each(that.data,function(i,n){
                    if(n.nodeId ==node.id ){
                        cont.push(n);
                        if(n.is_node){
                            that._getChild(n,cont);
                        }
                    }
                })
            }

        }
        function _cancelParentNode(id){
            var obj=this;
            $.each(obj.data,function(i,n){
                if(n.id ==id && n.is_node && n.is_check){
                    n.is_check=false;
                    obj.html.find('input[data-isNode="1"][data-id="'+id+'"]').prop('checked',false);
                    obj._cancelParentNode(n.nodeId);
                }
            })
        }
        function _checkParentNode(id){
            var obj=this;
            var allChildrenChecked = true;
            $.each(obj.data,function(i,n){
                if(n.nodeId==id && !n.is_check){
                    allChildrenChecked = false;
                }
            });
            $.each(obj.data,function(i,n){
                if(n.id == id && n.is_node && !n.is_check && allChildrenChecked){
                    n.is_check=true;
                    obj.html.find('input[data-isNode="1"][data-id="'+id+'"]').prop('checked',true);
                    obj._checkParentNode(n.nodeId);
                }
            });
        }
        function _chgAllChildren(nodeid,bol){
            var obj=this;
            $.each($.extend(true,[], this.data),function(i,n){   //这句话 看起来 好像 不用 extend
                if(n.nodeId == nodeid){
                    obj.data[i].is_check=bol;
                    if(n.is_node){
                        obj._chgAllChildren(n.id,bol);
                    }
                }
            });
        }


        /**
         * 构造html内部方法
         */
        function _makePanel(){
            var html='<div></div>';

            if(this.opt.has_search){
                html=this._makeSearch(html);
            }

            var css;
            if(this.opt.is_trigger){
                css={
                    'font-family':'Microsoft YaHei',
                    'z-index':this.opt.zIndex,
                    border:'1px solid #5d5d5d',
                    'background':'#fff',
                    position:'absolute',
                    maxHeight:this.opt.maxHeight,
                    'white-space':'nowrap',
                    'overflow':'auto'
                };
            }else{
                css={
                    'font-family':'Microsoft YaHei',
                    'background':'#fff',
                    maxHeight:this.opt.maxHeight,
                    'white-space':'nowrap',
                    'overflow':'auto'
                };
            }


            return $(html).css(css);
        }
        function _makeSearch(html){
            var search='<input class="x-tree-search" type="text" placeholder="搜索"/></div>';
            search=$(search).css({
                'border':'none',
                'padding':'4px 0',
                'margin':'5px auto 0 auto',
                'display':'block'
            });

            var obj=this;
            $(search).on('keyup paste',function(){
                var dom=this;
                clearTimeout(obj._searchTimer);
                obj._searchTimer=setTimeout(function(){
                    obj.search(dom.value);
                },100);
            });

            return  $(html).append(search);

        }
        function _makeNode(item) {
            var $html;
            if(this.opt.is_multi){
                $html = $('<div node-id="'+item.id+'">'+makeExpand()+'<label><input type="checkbox" data-isNode="1" data-id="'+item.id+'" '+(item.is_check?'checked':'')+' data-name="'+item.name+'"/><span>'+item.name+'</span></label></div>');
            }
            else{
                if(this.opt.only_leaf){
                    $html = $('<div node-id="'+item.id+'">'+makeExpand()+'<span>'+item.name+'</span></div>');
                }
                else{
                    $html = $('<div node-id="'+item.id+'">'+makeExpand()+'<label><input type="radio" name="'+ this.dom.selector +'" data-isNode="1" data-id="'+item.id+'" '+(item.is_check?'checked':'')+' data-name="'+item.name+'"/><span>'+item.name+'</span></label></div>');
                }
            }
            $html.find('span').css({
                'cursor':'pointer',
                'user-select':'none',
                '-webkit-user-select':'none',
                '-moz-user-select':'none',
                '-ms-user-select':'none'
            });
            $html.find('input').css({
                'vertical-align':'middle'
            });
            var obj=this;
            $html.find('i').on('click',function(e){
                //这里判断有没有数据的方法 感觉有点不靠谱
                if(!$html.find('i')[1]){
                    obj._showLayer(item.id);
                }else{
                    obj._removeLayer(item.id);
                }
                //e.stopPropagation();
            });

            return $html;
        }
        function _makeLeaf(item){
            var $html;
            if(this.opt.is_multi){
                $html = $('<div><span></span><label><input type="checkbox" data-id="'+item.id+'" data-isNode="0" data-name="'+item.name+'" '+(item.is_check?'checked':'') +'/>'+item.name+'</label></div>');
            }
            else{
                $html = $('<div>'+(this.opt.only_leaf?'':'<span></span>')+'<label><input type="radio" name="'+ this.dom.selector +'" data-id="'+item.id+'" data-isNode="0" data-name="'+item.name+'" />'+item.name+'</label></div>');
            }
            $html.find('span').css({
                'width':'16px',
                'user-select':'none',
                '-webkit-user-select':'none',
                '-moz-user-select':'none',
                '-ms-user-select':'none',
                'display':'inline-block'
            });
            $html.find('input').css({
                'vertical-align':'middle'
            });
            return $html;
        }
        function _makeItem(item){
            var $html;
            if(item.is_node){
                $html= this._makeNode(item);
            }else{
                $html= this._makeLeaf(item);
            }

            var obj=this;
            $html.find('input').on('click',function(){
                if(obj.opt.is_multi){
                    item.is_check=!item.is_check;
                }else{
                    $.each(obj.data,function(index,item){item.is_check = false;});
                    item.is_check=true;
                }


                obj._chgItem(item,$(this));

            });

            return $html;
        }


        function makeLayer(){
            var html='<div></div>';

            return $(html).css({
                'margin-left':'13px'
            });
        }

        function makeExpand(){
            // var html='<span data-icon="expand">＋</span>';
            var html='<i class="iconfont icon-expand"></i>';

            return $(html).css({
                'font-size':'12px',
                'font-weight':'bold',
                'vertical-align':'base-line',
                'padding-right':'0px',
                'cursor':'pointer'
            })[0].outerHTML;
        }

        function toShrink(dom){
            dom.removeClass('icon-Expand');
            dom.addClass('icon-shrink');
        }

        function toExpand(dom){
            dom.removeClass('icon-shrink');
            dom.addClass('icon-expand');
        }


        function checkData(data){
            //todo 这个for循环是否有问题？
            for(var i in data){
                return typeof data[i] =='object';
            }
            return false;
        }


        return {
            start:start,
            end:end,
            getName:getName,
            getId:getId,
            cancelItem:cancelItem,
            cancelAll:cancelAll,
            checkItem:checkItem,
            checkAll:checkAll,
            getItem:getItem,
            search:search,

            _showPanel:_showPanel,
            _showData:_showData,
            _expand:_expand,
            _expandLevel:_expandLevel,
            _showLayer:_showLayer,
            _removeLayer:_removeLayer,

            _getLayerData:_getLayerData,
            _chgItem:_chgItem,
            _getChild:_getChild,
            _cancelParentNode:_cancelParentNode,
            _checkParentNode:_checkParentNode,
            _chgAllChildren:_chgAllChildren,

            _makePanel:_makePanel,
            _makeSearch:_makeSearch,
            _makeNode: _makeNode,
            _makeLeaf:_makeLeaf,
            _makeItem:_makeItem
        };
    })();


})($);




