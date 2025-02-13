const localStorageSet = (key, value) => localStorage.setItem(key, value)
const localStorageGet = (key) => localStorage.getItem(key)
const localStorageRemove = (key) => localStorage.removeItem(key)
const localStorageWipe = () => localStorage.clear()

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => parent.querySelectorAll(selector);

const on = (element, event, handler) => {
    element.addEventListener(event, handler);
};

const sleep = async(ms) => new Promise(resolve => setTimeout(resolve, ms));

const modalActionTemplate = {
    done: {
        label: 'Done',
        class: 'primary'
    },
    okay: {
        label: 'Okay',
        class: 'primary'
    },
    cancel: {
        label: 'Cancel',
        class: 'text'
    },
    close: {
        label: 'Close',
        class: 'primary'
    }
};
const showModal = (options) => {
    options = options || {};
    options.title = options.title || 'Modal';
    options.bodyHTML = options.bodyHTML || '';
    options.actions = options.actions || [ modalActionTemplate.close ];
    options.cancellable = options.cancellable === false ? false : true;
    const elModal = document.createElement('dialog');
    elModal.classList.add('modal');
    elModal.innerHTML = /*html*/`
        <div class="content flex col">
            <div class="scrollable flex col gap-16">
                <div class="titlebar flex row align-center gap-12">
                    <div class="title grow">${options.title}</div>
                </div>
                <div class="body flex col">${options.bodyHTML}</div>
                <div class="actions flex row-rev wrap gap-12"></div>
            </div>
        </div>
    `;
    const elContent = $('.content', elModal);
    const titlebar = $('.titlebar', elModal);
    if (options.icon) {
        titlebar.insertAdjacentHTML('afterbegin', /*html*/`
            <div class="material-symbol">${options.icon.name}</div>
        `);
    }
    const elActions = $('.actions', elModal);
    for (const action of options.actions) {
        const elButton = document.createElement('button');
        elButton.classList.add('btn', action.class || 'text');
        elButton.innerText = action.label;
        elButton.disabled = action.disabled || false;
        elButton.onclick = async () => {
            const btns = $$('button', elActions);
            for (const btn of btns) {
                btn.disabled = true;
            }
            if (action.onClick) await action.onClick();
            if (action.close !== false) elModal.close();
        };
        elActions.appendChild(elButton);
    }
    on(elContent, 'click', (e) => {
        e.stopPropagation();
    });
    on(elModal, 'click', () => {
        elModal.dispatchEvent(new Event('cancel'));
    });
    on(elModal, 'cancel', (e) => {
        e.preventDefault();
        if (options.cancellable) {
            if (options.onCancel) options.onCancel();
            elModal.close();
        }
    });
    on(elModal, 'close', () => {
        if (options.onClose) options.onClose();
        if (!elModal.classList.contains('visible')) return;
        elModal.showModal();
        elModal.classList.remove('visible');
        setTimeout(() => {
            elModal.remove();
        }, 300);
    });
    on(elModal, 'keydown', (e) => {
        if (e.key === 'Escape') {
            if (!options.cancellable)
                e.preventDefault();
        }
    });
    document.body.appendChild(elModal);
    elModal.showModal();
    setTimeout(() => elModal.classList.add('visible'), 10);
    return elModal;
};

const mouse = { x: 0, y: 0 };
on(document, 'mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

const showContextMenu = (options, shouldPosition = true) => {
    options = options || {};
    options.width = options.width || 'auto';
    options.items = options.items || [];
    options.x = options.x || mouse.x;
    options.y = options.y || mouse.y;
    const elMenu = document.createElement('dialog');
    elMenu.classList.add('contextMenu', 'flex', 'col', 'gap-2');
    for (const item of options.items) {
        switch (item.type) {
            case 'item': {
                const btn = document.createElement('button');
                btn.classList = 'item btn smaller text';
                btn.disabled = !!item.disabled;
                btn.innerHTML += `<span class="material-symbol ${item.filledIcon ? 'filled' : 'outlined'}">${item.icon || item.filledIcon || ''}</span>`;
                btn.innerHTML += `<span class="label grow">${item.label}</span>`;
                if (item.hint) btn.innerHTML += `<span class="hint">${item.hint}</span>`;
                btn.onclick = async () => {
                    if (item.onClick) await item.onClick();
                    elMenu.close();
                };
                elMenu.appendChild(btn);
                break;
            }
            case 'element': {
                elMenu.appendChild(item.element);
                break;
            }
            case 'separator': {
                const el = document.createElement('div');
                el.classList.add('separator');
                elMenu.appendChild(el);
                break;
            }
        }
    }
    on(elMenu, 'click', () => {
        elMenu.close();
    });
    on(elMenu, 'keydown', (e) => {
        const items = $$('button.item:not(:disabled)', elMenu);
        let index = [...items].indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            index = (index + 1) % items.length;
            items[index].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            index = (index - 1 + items.length) % items.length;
            items[index].focus();
        }
    });
    on(elMenu, 'close', () => {
        if (!elMenu.classList.contains('visible')) return;
        elMenu.classList.remove('visible');
        setTimeout(() => {
            elMenu.remove();
        }, 300);
    });
    document.body.appendChild(elMenu);
    elMenu.showModal();
    // Position menu
    if (shouldPosition) {
        elMenu.style.transition = 'none';
        setTimeout(() => {
            const rect = elMenu.getBoundingClientRect();
            const menuWidth = rect.width;
            const menuHeight = elMenu.scrollHeight;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            let x = options.x;
            let y = options.y;
            if ((y + menuHeight) > screenHeight) {
                y = Math.max(0, (screenHeight - menuHeight - 8));
            }
            if ((x + menuWidth) > screenWidth) {
                x = Math.max(0, (x - menuWidth));
            }
            elMenu.style.left = `${x}px`;
            elMenu.style.top = `${y}px`;
            elMenu.style.height = `${menuHeight}px`;
        }, 10);
    }
    // Show menu
    setTimeout(() => {
        elMenu.style.transition = '';
        elMenu.classList.add('visible');
    }, 50);
    return elMenu;
};

on(window, 'resize', () => {
    const contextMenus = $$('dialog.contextMenu');
    contextMenus.forEach(menu => menu.close());
});

// Set accent color
function updateAccentColor() {
    const accentColors = [ 'red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'pink', 'gray' ];
    let accentColor = localStorageGet('accentColor');
    if (!accentColors.includes(accentColor)) {
        localStorageRemove('accentColor');
        delete accentColor;
    }
    document.body.dataset.colorAccent = accentColor || document.body.dataset.colorAccent;
}
updateAccentColor();

// Set and auto-update light/dark mode
function updateBodyColorMode() {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const colorMode = localStorageGet('colorMode');
    if (colorMode === 'dark' || (!colorMode && prefersDarkScheme)) {
        document.body.dataset.colorMode = 'dark';
    } else {
        document.body.dataset.colorMode = 'light';
    }
}
updateBodyColorMode();
on(window.matchMedia("(prefers-color-scheme: dark)"), 'change', updateBodyColorMode);