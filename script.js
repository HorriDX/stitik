// Конфигурация
const REPO_OWNER = 'HorriDX';
const REPO_NAME = '123ASD';
const TOKEN = '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'; // Создайте token с правами repo
const BRANCH = 'main';
const POSTS_FOLDER = 'posts';
const IMAGES_FOLDER = 'assets/images';
const FILES_FOLDER = 'assets/files';

// DOM элементы
const postsContainer = document.getElementById('postsContainer');
const newPostBtn = document.getElementById('newPostBtn');
const postModal = document.getElementById('postModal');
const closeBtn = document.querySelector('.close');
const postForm = document.getElementById('postForm');

// Открыть модальное окно
newPostBtn.addEventListener('click', () => {
    postModal.style.display = 'block';
});

// Закрыть модальное окно
closeBtn.addEventListener('click', () => {
    postModal.style.display = 'none';
});

// Закрыть при клике вне окна
window.addEventListener('click', (e) => {
    if (e.target === postModal) {
        postModal.style.display = 'none';
    }
});

// Загрузка постов при загрузке страницы
document.addEventListener('DOMContentLoaded', loadPosts);

// Обработка формы
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value;
    const text = document.getElementById('postText').value;
    const imageFile = document.getElementById('postImage').files[0];
    const fileFile = document.getElementById('postFile').files[0];
    
    try {
        // Загружаем изображение, если есть
        let imageUrl = '';
        if (imageFile) {
            imageUrl = await uploadFile(imageFile, IMAGES_FOLDER);
        }
        
        // Загружаем файл, если есть
        let fileUrl = '';
        let fileName = '';
        if (fileFile) {
            fileUrl = await uploadFile(fileFile, FILES_FOLDER);
            fileName = fileFile.name;
        }
        
        // Создаем пост
        const postData = {
            title,
            text,
            imageUrl,
            fileUrl,
            fileName,
            createdAt: new Date().toISOString()
        };
        
        // Сохраняем пост
        await createPost(postData);
        
        // Закрываем модальное окно и обновляем список
        postModal.style.display = 'none';
        postForm.reset();
        loadPosts();
        
    } catch (error) {
        console.error('Ошибка при создании поста:', error);
        alert('Произошла ошибка при создании поста');
    }
});

// Функция загрузки файла на GitHub
async function uploadFile(file, folder) {
    const path = `${folder}/${Date.now()}_${file.name}`;
    const content = await toBase64(file);
    
    const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Upload ${file.name}`,
                content: content.split(',')[1], // Удаляем префикс data:*/*;base64,
                branch: BRANCH
            })
        }
    );
    
    if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
    }
    
    const data = await response.json();
    return data.content.download_url;
}

// Функция создания поста
async function createPost(postData) {
    const postId = Date.now();
    const path = `${POSTS_FOLDER}/${postId}.json`;
    const content = JSON.stringify(postData, null, 2);
    
    const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `New post: ${postData.title}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: BRANCH
            })
        }
    );
    
    if (!response.ok) {
        throw new Error('Ошибка создания поста');
    }
}

// Функция загрузки всех постов
async function loadPosts() {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_FOLDER}`,
            {
                headers: {
                    'Authorization': `token ${TOKEN}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки постов');
        }
        
        const files = await response.json();
        postsContainer.innerHTML = '';
        
        // Сортируем посты по дате (новые сначала)
        const sortedFiles = files.sort((a, b) => b.name.localeCompare(a.name));
        
        for (const file of sortedFiles) {
            const fileResponse = await fetch(file.download_url);
            const postData = await fileResponse.json();
            renderPost(postData);
        }
    } catch (error) {
        console.error('Ошибка загрузки постов:', error);
        postsContainer.innerHTML = '<p>Не удалось загрузить посты</p>';
    }
}

// Функция отрисовки поста
function renderPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    
    let imageHtml = '';
    if (post.imageUrl) {
        imageHtml = `<img src="${post.imageUrl}" alt="${post.title}" class="post-image">`;
    }
    
    let fileHtml = '';
    if (post.fileUrl) {
        fileHtml = `
            <a href="${post.fileUrl}" class="post-file" download="${post.fileName}">
                <i class="fas fa-file-download"></i> ${post.fileName}
            </a>
        `;
    }
    
    postElement.innerHTML = `
        <h3 class="post-title">${post.title}</h3>
        ${imageHtml}
        <p class="post-text">${post.text}</p>
        ${fileHtml}
    `;
    
    postsContainer.appendChild(postElement);
}

// Вспомогательная функция для конвертации файла в base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}