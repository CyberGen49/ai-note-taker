const whisperTranscribe = async (audioFile) => {
    const apiKey = localStorageGet('openaiApiKey');
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return res.data;
};

const gptChatComplete = async(messages) => {
    const apiKey = localStorageGet('openaiApiKey');
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });
    return res.data.choices[0].message.content;
};

const pickSingleFile = () => new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
        resolve(input.files[0]);
    };
    input.click();
});

const downloadTextFile = (name, content) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ content ], { type: 'text/plain' }));
    a.download = name || 'file.txt';
    a.click();
}

const markdownToPureHtml = (markdown) => {
    return DOMPurify.sanitize(marked.parse(markdown));
};

const promptPresets = [
    {
        name: 'Just format the transcript',
        prompt: `Format the transcript to make it more readable. Correct any spelling or grammatical errors, and separate the text into paragraphs where appropriate, but otherwise don't modify the text any more than correcting errors.`
    },
    {
        name: 'Create study notes',
        prompt: `Create studyable notes from the transcript. Identify the main topic and use bullet points to list critical information and key takeaways, but don't skimp on adding extra info to enhance the understanding of the topics. Organize the notes logically, as if you took them while listening to the lecture.`
    },
    {
        name: 'Convert to textbook format',
        prompt: `Rewrite the contents of the transcript in a more formal and structured manner, suitable for a textbook. Ensure that the information is accurate and complete, and that the text is well-organized and easy to read. Add examples where necessary to supplement the concepts.`
    }
];

on(document, 'DOMContentLoaded', async() => {

    const btnSetColorMode = $('#setColorMode');
    const btnSetColorAccent = $('#setColorAccent');
    const btnSetApiKey = $('#setApiKey');
    const btnSelectFile = $('#selectFile');
    const btnPlayPause = $('#playPause');
    const elBtnPlayPauseIcon = $('.material-symbol', btnPlayPause);
    const elFileName = $('#fileName');
    const elAudio = $('#audio');
    const btnStartTranscription = $('#startTranscription');
    const elLoaderTranscribing = $('#loaderTranscribing');
    const inputTranscript = $('#inputTranscript');
    const btnDownloadTranscript = $('#downloadTranscript');
    const inputSummarizePrompt = $('#inputPrompt');
    const btnPromptPresets = $('#promptPresets');
    const btnSummarize = $('#summarize');
    const elLoaderSummarizing = $('#loaderSummarizing');
    const elResult = $('#result');
    const btnDownloadText = $('#downloadText');
    const btnDownloadHtml = $('#downloadHtml');
    let file;
    let isWorking = false;
    let summaryText = localStorageGet('summary') || '';

    let storeInputsTimeout;
    const storeInputs = () => {
        clearTimeout(storeInputsTimeout);
        storeInputsTimeout = setTimeout(() => {
            localStorageSet('transcript', inputTranscript.value);
            localStorageSet('summarizePrompt', inputSummarizePrompt.value);
        }, 1000);
    };

    const loadInputs = () => {
        inputTranscript.value = localStorageGet('transcript') || '';
        inputSummarizePrompt.value = localStorageGet('summarizePrompt') || '';
        elResult.innerHTML = markdownToPureHtml(summaryText || 'Your generated summary will be shown here...');
    };
    
    const updateButtonStates = () => {
        btnPlayPause.disabled = true;
        btnStartTranscription.disabled = true;
        btnSummarize.disabled = true;
        //btnDownloadText.disabled = true;
        btnDownloadHtml.disabled = true;
        const apiKey = localStorageGet('openaiApiKey');
        if (file) {
            btnPlayPause.disabled = false;
            if (apiKey && !isWorking) {
                btnStartTranscription.disabled = false;
            }
        }
        if (!isWorking && inputTranscript.value.trim() && inputSummarizePrompt.value.trim() && apiKey) {
            btnSummarize.disabled = false;
        }
    };

    on(btnSetColorMode, 'click', () => {
        showContextMenu({
            items: [
                {
                    type: 'item',
                    icon: 'autorenew',
                    label: `Auto`,
                    onClick: () => {
                        localStorageRemove('colorMode');
                        updateBodyColorMode();
                    }
                }, {
                    type: 'item',
                    icon: 'light_mode',
                    label: `Light`,
                    onClick: () => {
                        localStorageSet('colorMode', 'light');
                        updateBodyColorMode();
                    }
                }, {
                    type: 'item',
                    icon: 'dark_mode',
                    label: `Dark`,
                    onClick: () => {
                        localStorageSet('colorMode', 'dark');
                        updateBodyColorMode();
                    }
                }
            ]
        })
    });
    on(btnSetColorAccent, 'click', () => {
        const colors = [
            { name: 'Red', key: 'red' },
            { name: 'Orange', key: 'orange' },
            { name: 'Yellow', key: 'yellow' },
            { name: 'Green', key: 'green' },
            { name: 'Aqua', key: 'aqua' },
            { name: 'Blue', key: 'blue' },
            { name: 'Purple', key: 'purple' },
            { name: 'Pink', key: 'pink' },
            { name: 'Gray', key: 'gray' }
        ];
        const items = [];
        for (const color of colors) {
            items.push({
                type: 'item',
                icon: localStorageGet('accentColor') === color.key ? 'radio_button_checked' : 'radio_button_unchecked',
                label: color.name,
                onClick: () => {
                    localStorageSet('accentColor', color.key);
                    updateAccentColor();
                }
            })
        }
        showContextMenu({ items })
    });

    on(btnSetApiKey, 'click', () => {
        showModal({
            title: 'Set OpenAI API key',
            bodyHTML: /*html*/`
                <div class="flex col gap-8">
                    <label>Paste your key</label>
                    <input id="inputApiKey" class="textbox" placeholder="sk-proj-..." value="${localStorageGet('openaiApiKey') || ''}" style="width: 400px">
                </div>
            `,
            actions: [
                {
                    label: 'Save',
                    class: 'primary',
                    onClick: () => {
                        const key = $('#inputApiKey').value;
                        localStorageSet('openaiApiKey', key);
                        updateButtonStates();
                    }
                },
                {
                    label: 'Cancel'
                }
            ]
        })
    });

    on(btnSelectFile, 'click', async () => {
        const selectedFile = await pickSingleFile();
        const maxFileSize = 25 * 1024 * 1024;
        if (selectedFile.size > maxFileSize) {
            return showModal({
                title: 'File too large!',
                bodyHTML: /*html*/`
                    The file you selected is too big. Please choose a file smaller than 25 MB.
                `,
                actions: [
                    {
                        label: 'Okay',
                        class: 'primary'
                    }
                ]
            });
        }
        file = selectedFile;
        updateButtonStates();
        elFileName.innerText = selectedFile.name;
        elAudio.pause();
        const reader = new FileReader();
        reader.onload = () => {
            elAudio.src = reader.result;
        };
        reader.readAsDataURL(selectedFile);
    });

    on(btnPlayPause, 'click', () => {
        if (elAudio.paused) {
            elAudio.play();
        } else {
            elAudio.pause();
        }
    });

    on(elAudio, 'play', () => {
        elBtnPlayPauseIcon.innerText = 'pause';
    });

    on(elAudio, 'pause', () => {
        elBtnPlayPauseIcon.innerText = 'play_arrow';
    });

    on(inputTranscript, 'input', () => {
        updateButtonStates();
        storeInputs();
    });

    on(inputTranscript, 'change', () => {
        inputTranscript.value = inputTranscript.value.trim();
    });

    on(btnDownloadTranscript, 'click', () => {
        const selectedFileName = file ? file.name.replace(/\..*$/, '') : '';
        let transcriptFileName = selectedFileName ? `${selectedFileName}-transcript.txt` : 'transcript.txt';
        downloadTextFile(transcriptFileName, inputTranscript.value);
    });

    on(btnStartTranscription, 'click', async () => {
        isWorking = true;
        let startTime = Date.now();
        const audioDuration = elAudio.duration || 1;
        const transcriptionSpeed = 26;
        const progInterval = setInterval(() => {
            const secsSinceStart = (Date.now() - startTime) / 1000;
            const secsRemaining = (audioDuration / transcriptionSpeed) - secsSinceStart;
            console.log(`Transcribing ${audioDuration}s audio file - ${secsSinceStart}s elapsed, ${secsRemaining}s remaining`);
        }, 500);
        updateButtonStates();
        elLoaderTranscribing.style.display = '';
        inputTranscript.disabled = true;
        let text = '';
        try {
            inputTranscript.value = 'Generating transcript from audio, this may take a couple minutes...';
            text = await whisperTranscribe(file);
        } catch (error) {
            showModal({
                title: 'Audio transcription failed',
                bodyHTML: /*html*/`
                    <p>The request to OpenAI failed with the following error:</p>
                    <p>${error?.response?.data?.error?.message || error.toString() || 'Unknown error'}</p>
                `
            });
        }
        clearInterval(progInterval);
        const processTimeSecs = (Date.now() - startTime) / 1000;
        const speed = audioDuration / processTimeSecs;
        console.log(`Transcription of ${audioDuration}s audio file took ${processTimeSecs}s - ${speed} times real-time`);
        isWorking = false;
        elLoaderTranscribing.style.display = 'none';
        updateButtonStates();
        inputTranscript.value = text;
        inputTranscript.disabled = false;
        inputTranscript.dispatchEvent(new Event('input'));
    });

    on(inputSummarizePrompt, 'input', () => {
        updateButtonStates();
        storeInputs();
    });

    on(inputSummarizePrompt, 'change', () => {
        inputSummarizePrompt.value = inputSummarizePrompt.value.trim();
    });

    on(btnPromptPresets, 'click', () => {
        showContextMenu({
            items: promptPresets.map(preset => ({
                type: 'item',
                label: preset.name,
                onClick: () => {
                    inputSummarizePrompt.value = preset.prompt;
                    inputSummarizePrompt.dispatchEvent(new Event('input'));
                }
            }))
        });
    });

    on(btnSummarize, 'click', async () => {
        isWorking = true;
        let startTime = Date.now();
        updateButtonStates();
        elResult.innerText = 'Summarizing transcript, this may take a couple minutes...';
        elLoaderSummarizing.style.display = '';
        const prompt = inputSummarizePrompt.value;
        const transcript = inputTranscript.value;
        try {
            summaryText = await gptChatComplete([
                {
                    role: 'developer',
                    content: `Your job is to refine an audio transcript provided by the user. They will describe the refinements they want you to make, then provide the raw text transcript. You should only respond with the refined transcript, with no added text.`
                },
                {
                    role: 'user',
                    content: `${prompt}\n\n---\n\n${transcript}`
                }
            ]);
        } catch (error) {
            summaryText = `Summarization failed.`;
            showModal({
                title: 'Summarization failed',
                bodyHTML: /*html*/`
                    <p>The request to OpenAI failed with the following error:</p>
                    <p>${error?.response?.data?.error?.message || error.toString() || 'Unknown error'}</p>
                `,
                actions: [
                    {
                        label: 'Okay',
                        class: 'primary'
                    }
                ]
            });
        }
        console.log(`Summarization took ${Date.now() - startTime}ms`);
        isWorking = false;
        elResult.innerHTML = markdownToPureHtml(summaryText);
        localStorageSet('summary', summaryText);
        elLoaderSummarizing.style.display = 'none';
        updateButtonStates();
    });

    on(btnDownloadText, 'click', () => {
        downloadTextFile(`summary-${dayjs().format('YYYY-MM-DD-HHmm')}.md`, summaryText || '');
    });

    loadInputs();
    updateButtonStates();
    
});