import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAMbJOpvmaPUlSktwl1lmdW28UuQmKp82I",
    authDomain: "my-cat-diary-be00a.firebaseapp.com",
    projectId: "my-cat-diary-be00a",
    storageBucket: "my-cat-diary-be00a.firebasestorage.app",
    messagingSenderId: "562714697589",
    appId: "1:562714697589:web:cc8a1d6ab2a25d19843d3c",
    measurementId: "G-D52BNH1T14"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const container = document.getElementById('sections-container');
const addBtn = document.getElementById('add-section-btn');
let thumbnailIndex = 0;

async function uploadToImgBB(file) {
    const apiKey = "85ef06b718b1a5994d079cb97160019b"; 
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (data.success) {
        console.log("업로드 성공! 주소:", data.data.url);
        return data.data.url; // 이 주소를 Firestore에 저장하면 끝!
    } else {
        throw new Error("업로드 실패");
    }
}

function bindEvents(section, index) {
    const fileInput = section.querySelector('.item-file');
    const previewImg = section.querySelector('.preview-area img');
    const previewDiv = section.querySelector('.preview-area');

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                previewImg.src = reader.result;
                previewImg.style.display = 'block';
            };
        }
    };

    previewDiv.onclick = () => {
        thumbnailIndex = index;
        updateHighlights();
    };
}

function updateHighlights() {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach((s, i) => {
        const div = s.querySelector('.preview-area');
        const label = s.querySelector('.thumb-label');
        if (i === thumbnailIndex) {
            div.style.borderColor = "#000";
            if(label) label.style.display = "block";
        } else {
            div.style.borderColor = "#ddd";
            if(label) label.style.display = "none";
        }
    });
}

// 섹션 추가 버튼 클릭 시 실행되는 함수
addBtn.onclick = () => {
    const index = document.querySelectorAll('.content-section').length;
    const newSection = document.createElement('div');
    newSection.className = 'content-section';
    
    // 디자인 일관성을 위해 기존 스타일을 유지하면서 'multiple' 속성을 추가했습니다.
    newSection.style = "border: 1px solid #eee; padding: 20px; margin-bottom: 20px; position: relative;";
    
    newSection.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label style="font-weight: bold; display: block; margin-bottom: 5px;">Images (Multiple available)</label>
            <input type="file" class="item-file" accept="image/*" multiple required 
                   style="display: block; margin-top: 5px;">
            
            <div class="preview-area" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
            
            <small class="thumb-label" style="color: #007bff; display: none;">★ Selected as Thumbnail</small>
        </div>
        <div>
            <label style="font-weight: bold;">Description</label>
            <textarea class="item-text" rows="4" placeholder="Write description for these photos..." 
                      style="width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ddd;"></textarea>
        </div>
        <button type="button" class="remove-section-btn" 
                style="margin-top: 10px; background: #ff4d4d; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;">
            Remove Section
        </button>
    `;

    container.appendChild(newSection);

    // 삭제 버튼 기능 연결
    newSection.querySelector('.remove-section-btn').onclick = () => {
        newSection.remove();
        updateHighlights();
    };

    // 파일 선택 시 미리보기 처리 (기존 bindEvents 대신 직접 연결하거나 bindEvents 수정 필요)
    const fileInput = newSection.querySelector('.item-file');
    const previewArea = newSection.querySelector('.preview-area');

    fileInput.onchange = (e) => {
        previewArea.innerHTML = ''; // 초기화
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style = "width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;";
                previewArea.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    };
};

// 초기 설정
bindEvents(document.querySelector('.content-section'), 0);
updateHighlights();

// admin.js 내의 submit 이벤트 리스너 수정

document.getElementById('diary-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const sectionElements = document.querySelectorAll('.content-section');
    const sectionsData = [];

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Uploading Images...";

        for (let el of sectionElements) {
            const fileInput = el.querySelector('.item-file');
            const txt = el.querySelector('.item-text').value;
            let imageUrls = []; // 사진 주소들을 담을 배열

            // [핵심] 여러 개의 파일이 선택되었을 때 처리
            if (fileInput && fileInput.files.length > 0) {
                // 선택된 모든 파일을 순회하며 업로드
                for (let file of fileInput.files) {
                    const url = await uploadToImgBB(file);
                    if (url) imageUrls.push(url);
                }
            }

            // 이제 img 하나가 아니라 imgs 배열을 저장합니다.
            sectionsData.push({ 
                imgs: imageUrls, // 배열로 변경
                txt: txt 
            });
        }

        submitBtn.innerText = "Saving to Database...";

        await addDoc(collection(db, "diaries"), {
            title: document.getElementById('post-title').value,
            sections: sectionsData, // 수정된 데이터 구조
            thumbnailIndex: thumbnailIndex,
            createdAt: serverTimestamp()
        });

        alert("Successfully published!");
        window.location.href = "archive.html";
    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "PUBLISH STORY";
    }
};