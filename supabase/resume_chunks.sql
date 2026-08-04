-- ================================================================
-- RecruitIQ — Resume Chunks (RAG Memory)
-- Built from Abdul Rafay's actual CV + portfolio (portfolio-abdul-rafay19.vercel.app)
-- Run AFTER schema.sql
-- ================================================================

INSERT INTO resume_chunks (content, chunk_type, tags, importance) VALUES

('I am Abdul Rafay, a Software Engineering student and AI/ML Engineer based in
Multan, Punjab, Pakistan. I work on LLM-based applications, RAG pipelines, and
agentic AI systems — building chatbots, document-based QA systems, and
automation-driven solutions. I have hands-on experience in Python, machine
learning, and deep learning, spanning computer vision, NLP, and end-to-end AI
system development, from building ML pipelines to integrating models into
scalable web applications. I am open to remote AI/ML roles globally and
Pakistan-based roles, available for full-time, part-time, contract, and
internship positions. Contact: abdulrafay13737@gmail.com, +92 327 1373799,
linkedin.com/in/abdul-rafay19, github.com/abdul-rafay19,
portfolio-abdul-rafay19.vercel.app.',
'summary',
ARRAY['AI','ML','Pakistan','student','LLM','RAG','agentic-AI','automation'],
'high'),

('Technical Skills: Python, SQL, Machine Learning, Deep Learning, Large Language
Models (LLMs), Retrieval-Augmented Generation (RAG), Agentic AI, Prompt
Engineering, Computer Vision, Natural Language Processing (NLP), FastAPI,
Firestore, JWT Authentication, Data Analysis, n8n automation, ChromaDB,
Sentence-Transformers, Streamlit, NVIDIA NIM, PHP, MySQL. Languages: English,
Urdu.',
'skills',
ARRAY['Python','SQL','LLM','RAG','Agentic-AI','FastAPI','n8n','ChromaDB',
'NVIDIA-NIM','Computer-Vision','NLP','Streamlit','JWT'],
'high'),

('Current Role: AI/ML Engineer at Vision Giants, Multan, Pakistan (July 2025 -
Current). Built and deployed a suite of Islamic apps with backend APIs,
database design, real-time data integration, and intuitive user interfaces.
Integrated AI/ML capabilities including predictive modeling and speech-based
interaction to enhance automation and user experience. Completed an onsite
AI/ML internship at Vision Giants implementing deep learning frameworks and
NLP tools on a real-world application, earning a Certificate of Appreciation.',
'experience',
ARRAY['AI-ML-engineer','Vision-Giants','Pakistan','backend','speech-AI',
'predictive-modeling','production'],
'high'),

('Project: MediMind (April 2026 - June 2026). Architected an AI-powered medical
triage system using FastAPI and Python, powered by NVIDIA NIM serving a
3-model fallback chain (Llama 3.1 to Mistral 7B to Phi-3) for reliable
inference. Built a RAG pipeline using ChromaDB and sentence-transformers for
symptom retrieval, extracting symptoms and classifying urgency into three
triage levels. Built the full-stack system end-to-end: dual-database
architecture (SQLite + Firestore), JWT authentication, geolocation-based
hospital discovery, and PDF medical report generation.
Tech: FastAPI, Python, NVIDIA NIM, ChromaDB, sentence-transformers, SQLite,
Firestore, JWT.',
'project',
ARRAY['RAG','LLM','NVIDIA-NIM','FastAPI','ChromaDB','healthcare','medical-AI',
'JWT','fallback-chain','production'],
'high'),

('Project: CNNect Classifier (April 2025 - May 2025), built during an Intern
Intelligence internship. A real-time image classification web app built on a
custom CNN trained on CIFAR-10. Built an end-to-end deep learning pipeline
from data loading to inference, and deployed an interactive interface for
image uploads with instant predictions and class-wise confidence scores.
Tech: Python, CNN, CIFAR-10, deep learning pipeline.',
'project',
ARRAY['Computer-Vision','CNN','deep-learning','image-classification','Python'],
'medium'),

('Project: Brain Tumor Segmentation (May 2025 - June 2025), built at Arch
Technologies. A segmentation pipeline combining YOLOv8 for tumor detection and
SAM (Segment Anything Model) for accurate mask generation on the BraTS 2021
brain MRI dataset. Built an end-to-end, deployment-ready solution with
real-time visualization via Streamlit, focusing on precise medical image
segmentation.
Tech: YOLOv8, SAM, BraTS 2021, Streamlit, Python.',
'project',
ARRAY['Computer-Vision','YOLOv8','SAM','medical-imaging','segmentation',
'Streamlit','healthcare'],
'high'),

('Project: Fake News Detection (May 2025 - June 2025), built at Air University.
An NLP-driven classification system for identifying misleading news articles
in real time. Cleaned and preprocessed labeled fake/real news datasets,
applying tokenization, stop-word removal, and stemming/lemmatization.
Vectorized text with TF-IDF and Count Vectorizer, then trained and compared
Logistic Regression, Random Forest, and SVM classifiers. Evaluated models on
accuracy, precision, recall, and F1-score, and shipped a real-time Streamlit
app for live predictions.
Tech: NLTK, spaCy, scikit-learn, TF-IDF, Streamlit, Python.',
'project',
ARRAY['NLP','NLTK','spaCy','scikit-learn','TF-IDF','classification',
'Streamlit','machine-learning'],
'medium'),

('Project: Hand Gesture Recognition (personal project). A real-time hand
gesture recognition and finger-counting system with both a desktop and a web
interface. Built real-time hand detection and tracking, counting 1-5 raised
fingers live from a camera feed. Recognized common gestures (Thumbs Up, Hi,
Fist, Open Hand) using MediaPipe landmarks. Shipped as both a lightweight
OpenCV desktop app and a Streamlit web app.
Tech: OpenCV, MediaPipe, Streamlit, Python.',
'project',
ARRAY['Computer-Vision','OpenCV','MediaPipe','real-time','Streamlit'],
'medium'),

('Project: Flavor Finder (personal project). A full-stack restaurant discovery
app with GPS-based search, reviews, ratings, and an admin panel. Built secure
user registration/login, restaurant search by real-time GPS location, and a
full reviews-and-ratings system. Designed a normalized MySQL schema with
functions, triggers, and stored procedures across users, restaurants,
cuisines, and reviews. Added an admin panel for managing users and reviews,
plus early AI-powered restaurant recommendations.
Tech: PHP, MySQL, HTML/CSS, Geolocation.',
'project',
ARRAY['full-stack','PHP','MySQL','geolocation','web-development'],
'low'),

('Education: Bachelor of Science in Software Engineering, Air University
(September 2023 - July 2027). Certificates: "What is Generative AI?"
(LinkedIn Learning) covering generative AI fundamentals, model types, ethical
considerations, AI-generated content, NLP models, and Variational
Autoencoders (VAEs) for anomaly detection. "CS302: Software Engineering"
(Saylor Academy, issued Dec 11, 2024) covering system design, testing, and
requirements gathering. "Modern DevOps Practices Powered by AWS" (University
of Mianwali, Dept. of Software Engineering) covering CI/CD pipelines,
automation, deployment strategies, and infrastructure management.',
'education',
ARRAY['Software-Engineering','Air-University','education','Pakistan',
'generative-AI','DevOps','certificates'],
'medium');
