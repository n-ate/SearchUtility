if (console) console.log('file: client-ui.js');

__.define(
    [
        'jquery-ui',
        'client-css'
    ],
    function ($, css) {
        /** facilitates the creation of interactive "client" components **/
        var p = {
            addScopedCSS: function () {
                css.append('/shared/jquery-ui.css');
                css.append('/admin/site.css');
            }
        };

        var pub = {
            dialog: function (title, content, settings) {
                var $scoped, $msg, $uiMsg;
                p.addScopedCSS();
                $scoped = $("<div class='ws-scoped'><div title='" + title + "' class='ws-message'>" + content + "</div></div>");
                $('body').append($scoped);
                $msg = $scoped.find('.ws-message');
                let $dialog = $msg.dialog(settings);
                $uiMsg = $('.ws-message').closest('.ui-dialog');
                $uiMsg
                    .css('position', 'fixed')//dialogs should not scroll with page
                    .css('left', '40px')
                    .css('top', '40px');
                $scoped.append($uiMsg);//jquery moves dialogs to body tag; move back to scope.
                $uiMsg.$dialog = $dialog;
                return $uiMsg;
            },
            notify: function (title, notice) {
                $('.ws-notice').remove();
                pub.dialog(title, "<p>" + notice + "</p>", { minHeight: 50, buttons: { close: function () { $(this).dialog('close'); } } })
                    .addClass('ws-notice');
            },
            button: function (content, action, className) {
                var $scoped, $button;
                p.addScopedCSS();
                $scoped = $("<div class='ws-scoped'><button class='ws-button " + (className || '') + "'>" + content + "</button></div>");
                $('body').append($scoped);
                $button = $scoped.find('.ws-button');
                $button.button();
                $button.click(action);
            },
            sendRequest: function (data) {
                chrome.runtime.sendMessage(/*creatorTabId,*/ data);//, options, responseCallback);
            }
        };
        return pub;
    }
);