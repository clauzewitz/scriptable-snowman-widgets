// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: chart-pie;
const VERSION = '1.0.0';

const DEBUG = false;
const log = (args) => {

    if (DEBUG) {
        console.log(args);
    }
};

const ARGUMENTS = {
    // refreshes is up to IOS
    refreshInterval: 360, //mins
    loginId: undefined,
    password: undefined
};
Object.seal(ARGUMENTS);

// DO NOT EDIT BEYOND THIS LINE ------------------

const MENU_PROPERTY = {
    rowDismiss: true,
    rowHeight: 50,
    subtitleColor: Color.lightGray()
};
Object.freeze(MENU_PROPERTY);

const URL_PROPERTY = {
    login: 'https://www.snowman.co.kr/portal/login',
    logout: 'https://www.snowman.co.kr/portal/logout',
    dataUsage: 'https://www.snowman.co.kr/portal/mysnowman/useQntyRetv/rtimeUseQnty',
};
Object.freeze(URL_PROPERTY);

const CommonUtil = {
    isNumber: (value) => {
        let isValid = false;
    
        if (typeof value === 'number') {
            isValid = true;
        } else if (typeof value === 'string') {
            isValid = /^\d{1,}$/.test(value);
        }
    
        return isValid;
    },
    compareVersion: (version1 = '', version2 = '') => {
        version1 = version1.replace(/\.|\s|\r\n|\r|\n/gi, '');
        version2 = version2.replace(/\.|\s|\r\n|\r|\n/gi, '');

        if (!this.isNumber(version1) || !this.isNumber(version2)) {
            return false;
        }

        return version1 < version2;
    }
};

const isOnLine = async () => {
    const webView = new WebView();
    await webView.loadURL('about:blank');
    let isOnLine = await webView.evaluateJavaScript('navigator.onLine');
    
    log(isOnLine);
    
    return isOnLine;
};

// HttpClient module ------------------------
// const HttpClient = importModule('HttpClient')
// EMBED 
const HttpClient = {
    //----------------------------------------------
    fetchData: async () => {
        let totalData = 0;
        let usageData = 0;
        let remainData = 0;
        let onLine = await isOnLine();

        log(onLine)

        if (onLine) {
            try {
                const webView = new WebView();
                
                await webView.loadURL(URL_PROPERTY.login);
                await webView.evaluateJavaScript(`
                    document.querySelector('input[name=loginId]').value = '${ARGUMENTS.loginId}';
                    document.querySelector('input[name=loginPwd]').value = '${ARGUMENTS.password}';
                    document.querySelector('.login-btn > button').click();
                `);
                await webView.waitForLoad();
    
                await webView.loadURL(URL_PROPERTY.dataUsage);
    
                if (await webView.evaluateJavaScript('document.URL') === URL_PROPERTY.login) {
                    throw Error();
                }
    
                totalData = await webView.evaluateJavaScript("Number(document.querySelector('.tbl-list > tbody tr:first-child td:first-of-type').innerText.replaceAll(',', ''));");
                usageData = await webView.evaluateJavaScript("Number(document.querySelector('.tbl-list > tbody tr:first-child td:nth-of-type(2)').innerText.replaceAll(',', ''));");
                remainData = await webView.evaluateJavaScript("Number(document.querySelector('.tbl-list > tbody tr:first-child td:nth-of-type(3)').innerText.replaceAll(',', ''));");
    
                webView.loadURL(URL_PROPERTY.logout);
            } catch (err) {
                log(err)
            }
        }
        
        return {
            onLine: onLine,
            totalData: totalData || 0,
            usageData: usageData || 0,
            remainData: remainData || 0,
            usagePercent: Math.round((usageData / totalData) * 100) || 0,
            remainPercent: Math.round((remainData / totalData) * 100) || 0
        };
    },
    updateModule: async () => {
        try {
            const latestVersion = await new Request('https://raw.githubusercontent.com/clauzewitz/scriptable-snowman-widgets/master/version').loadString();

            if (CommonUtil.compareVersion(VERSION, latestVersion)) {
                const code = await new Request('https://raw.githubusercontent.com/clauzewitz/scriptable-snowman-widgets/master/snowman.js').loadString();
                this.fm.writeString(this.fm.joinPath(this.fm.documentsDirectory(), `${Script.name()}.js`), code);
                await this.presentAlert(`Update to version ${latestVersion}\nPlease launch the app again.`);
            } else {
                await this.presentAlert(`version ${VERSION} is currently the newest version available.`);
            }
        } catch (e) {
            log(e.message);
        }
    },
    //----------------------------------------------
    presentAlert: async (prompt = '', items = ['OK'], asSheet = false) => {
        try {
            const alert = new Alert();
            alert.message = prompt;
    
            items.forEach(item => {
                alert.addAction(item);
            });
    
            return asSheet ? await alert.presentSheet() : await alert.presentAlert();
        } catch (e) {
            log(e.message);
        }
    }
};
// HttpClient module ends -------------------

//------------------------------------------------
const getRealTimeUsage = async () => {
    let response = await HttpClient.fetchData();

    console.log(response);

    return response;
};

//------------------------------------------------
const createWidget = async (widgetFamily) => {
    let data = await getRealTimeUsage();

    const padding = getPaddingSize(widgetFamily);
    const fontSize = getFontSize(widgetFamily);

    const widget = new ListWidget();
    widget.refreshAfterDate = new Date((Date.now() + (1000 * 60 * ARGUMENTS.refreshInterval)));
    widget.setPadding(padding, padding, padding, padding);

    try {
        let m_CanvSize = 200;

        const m_CanvRadiusMonth = 80;
        const m_CanvFillColorDataGood = '#1AE01A';
        const m_CanvFillColorDataOK = '#E0E01A';
        const m_CanvFillColorDataBad = '#E01A1A';
        const m_CanvStrokeColor = '#431743'; // Circles background color
        const m_CanvBackColor = '#242424';   // Widget background color
        const m_CanvTextColor = '#FFFFFF'; 

        const m_Canvas = new DrawContext();
        m_Canvas.size = new Size(m_CanvSize, m_CanvSize);
        m_Canvas.respectScreenScale = true;

        let bgc = new Rect(0, 0, m_CanvSize, m_CanvSize);
        m_Canvas.setFillColor(new Color(m_CanvBackColor));
        m_Canvas.fill(bgc);

        const fillColorData = (data.usagePercent <= 60) ? m_CanvFillColorDataGood : ((data.usagePercent / 100 <= 80) ? m_CanvFillColorDataOK : m_CanvFillColorDataBad);

        drawArc(
            m_Canvas,
            new Point(m_CanvSize / 2, m_CanvSize / 2),
            m_CanvRadiusMonth,
            getRectSize(widgetFamily),
            data.remainPercent * 3.6,
            fillColorData,
            m_CanvStrokeColor,
        );

        m_Canvas.setTextAlignedCenter();
        m_Canvas.setTextColor(new Color(m_CanvTextColor));
        m_Canvas.setFont(Font.boldSystemFont(fontSize));

        m_Canvas.drawTextInRect(`${data.remainPercent} %`, new Rect(
            0,
            m_CanvSize / 2 - (fontSize / 2),
            m_CanvSize,
            fontSize
        ));

        m_Canvas.setFont(Font.thinSystemFont(fontSize / 3));
        m_Canvas.drawTextInRect(`(${Math.floor(data.usageData / 1000).toFixed(1)} GB / ${Math.floor(data.totalData / 1000)} GB)`, new Rect(
            0,
            m_CanvSize / 2 + (fontSize / 2),
            m_CanvSize,
            fontSize
        ));

        widget.backgroundImage = m_Canvas.getImage();

        if (!data.onLine) {
            const stack = widget.addStack();
            stack.layoutHorizontally();
            stack.centerAlignContent();
            stack.spacing = 3;

            addSymbol(stack, 'wifi.exclamationmark', fontSize);
            stack.addSpacer();
            widget.addSpacer();
        }
    } catch (err) {
        log(err);
    }

    return widget;
};

//------------------------------------------------
const addSymbol = (container, name, size) => {
    const icon = container.addImage(SFSymbol.named(name).image);
    icon.tintColor = Color.white();
    icon.imageSize = new Size(size, size);

    return icon;
};

//------------------------------------------------
const addText = (container, text, align, size) => {
    const txt = container.addText(text);
    txt[`${align}AlignText`]();
    txt.font = Font.systemFont(size);
    txt.shadowRadius = 3;
    txt.textColor = Color.white();
    txt.shadowColor = Color.black();
};

//------------------------------------------------
const sinDeg = (deg) => {
    return Math.sin((deg * Math.PI) / 180);
};

//------------------------------------------------
const cosDeg = (deg) => {
    return Math.cos((deg * Math.PI) / 180);
};

//------------------------------------------------
const drawArc = (canvas, ctr, rad, w, deg, fillColor, strokeColor) => {
    let bgx = ctr.x - rad;
    let bgy = ctr.y - rad;
    let bgd = 2 * rad;
    let bgr = new Rect(bgx, bgy, bgd, bgd);

    canvas.setFillColor(new Color(fillColor));
    canvas.setStrokeColor(new Color(strokeColor));
    canvas.setLineWidth(w);
    canvas.strokeEllipse(bgr);

    for (t = 0; t < deg; t++) {
        rect_x = ctr.x - rad * sinDeg(t) - w / 2;
        rect_y = ctr.y - rad * cosDeg(t) - w / 2;
        rect_r = new Rect(rect_x, rect_y, w, w);
        canvas.fillEllipse(rect_r);
    }
};

//------------------------------------------------
const getPaddingSize = (widgetFamily) => {
    widgetFamily = widgetFamily || config.widgetFamily;

    return (widgetFamily === 'large') ? 12 : 10;
};

//------------------------------------------------
const getRectSize = (widgetFamily) => {
    widgetFamily = widgetFamily || config.widgetFamily;
    
    return (widgetFamily === 'large') ? 12 : 15;
};

//------------------------------------------------
const getFontSize = (widgetFamily) => {
    widgetFamily = widgetFamily || config.widgetFamily;
    
    return (widgetFamily === 'large') ? 30 : 20;
};

//------------------------------------------------
const presentAlert = async (prompt, items, asSheet) => {
    const alert = new Alert();
    alert.message = prompt;
    
    for (const item of items) {
        alert.addAction(item);
    }

    return asSheet ? await alert.presentSheet() : await alert.presentAlert();
};

const checkWidgetParameter = () => {

    if (args.widgetParameter) {
        const aWidgetParameter = args.widgetParameter.split(/\s*,\s*/);
        ARGUMENTS.loginId = aWidgetParameter[0] ?? 'none';
        ARGUMENTS.password = aWidgetParameter[1] ?? 'none';
    }
};

const MENU_ROWS = {
    title: {
        isHeader: true,
        title: 'Snowman Mobile Data Widget',
        subtitle: `version: ${VERSION}`,
        onSelect: undefined
    },
    checkUpdate: {
        isHeader: false,
        title: 'Check for Updates',
        subtitle: 'Check for updates to the latest version.',
        onSelect: async () => {
            HttpClient.updateModule();
        }
    },
    preview: {
        isHeader: false,
        title: 'Preview Widget',
        subtitle: 'Provides a preview for testing.',
        onSelect: async () => {            
            const options = ['Small', 'Large', 'Cancel'];
            const resp = await presentAlert('Preview Widget', options);
    
            if (resp === options.length - 1) {
                return;
            }
    
            const size = options[resp];
            const widget = await createWidget(size.toLowerCase());
            
            await widget[`present${size}`]();
        }
    }
};

// Wisget code -----------------------------------

// information

if (config.runsInWidget) {
    Script.setWidget(await createWidget());
} else {
    const menu = new UITable();
    menu.showSeparators = true;

    Object.values(MENU_ROWS).forEach((rowInfo) => {
        const row = new UITableRow();
        row.isHeader = rowInfo.isHeader;
        row.dismissOnSelect = MENU_PROPERTY.rowDismiss;
        row.height = MENU_PROPERTY.rowHeight;
        const cell = row.addText(rowInfo.title, rowInfo.subtitle);
        cell.subtitleColor = MENU_PROPERTY.subtitleColor;
        row.onSelect = rowInfo.onSelect;
        menu.addRow(row);
    });

    await menu.present(false);
}

Script.complete();
