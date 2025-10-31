<template>
  <div class="app">
    <h2>硅基流动声音克隆 Demo</h2>

    <input type="file" accept="audio/*" @change="onFileChange" />
    <input v-model="textToSynthesize" placeholder="请输入要生成的文本" />

    <button @click="uploadAndClone" :disabled="!file">上传 & 克隆</button>

    <div v-if="audioUrl">
      <h3>生成的克隆音频</h3>
      <audio :src="audioUrl" controls></audio>
      <a :href="audioUrl" download="cloned.mp3">下载音频</a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const file = ref(null)
const textToSynthesize = ref('录制一下自己的音频，然后做一个智能体， 克隆我本人的声音，然后我开发一个这样的软件')
const audioUrl = ref('')

const API_KEY = 'sk-kyddpjpruhztgknyfrrggbfhttprgxgnvibotikwrvmpqgjq'

// 处理文件选择
const onFileChange = (e) => {
  file.value = e.target.files[0]
}

// 生成合法 customName（只保留字母数字下划线，长度 <= 64）
const generateCustomName = (filename) => {
  let name = filename.replace(/\.[^/.]+$/, '') // 去掉扩展名
  name = name.replace(/[^a-zA-Z0-9_-]/g, '_')  // 非法字符替换成 _
  if (name.length > 64) name = name.slice(0, 64)
  return name
}

// 上传 mp3 并克隆
const uploadAndClone = async () => {
  if (!file.value) return

  const customName = generateCustomName(file.value.name)

  // 构造 formData
  const formData = new FormData()
  formData.append('file', file.value)
  formData.append('model', 'FunAudioLLM/CosyVoice2-0.5B')
  formData.append('customName', customName)
  formData.append('text', textToSynthesize.value)

  try {
    // 上传音频，获取 speech URI
    const uploadRes = await axios.post(
      'https://api.siliconflow.cn/v1/uploads/audio/voice',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    const speechUri = uploadRes.data.uri
    console.log('speech URI:', speechUri)

    // 调用 TTS 生成音频
    const ttsRes = await axios.post(
      'https://api.siliconflow.cn/v1/speech/synthesize',
      {
        voice: speechUri,
        text: textToSynthesize.value,
        format: 'mp3'
      },
      { responseType: 'blob', headers: { 'Authorization': `Bearer ${API_KEY}` } }
    )

    // 生成可播放 URL
    const blob = new Blob([ttsRes.data], { type: 'audio/mpeg' })
    audioUrl.value = URL.createObjectURL(blob)

  } catch (err) {
    console.error(err)
    alert('上传或生成音频失败，请检查控制台')
  }
}
</script>

<style>
.app {
  max-width: 600px;
  margin: 40px auto;
  font-family: sans-serif;
}
input, button {
  display: block;
  margin: 10px 0;
}
audio {
  display: block;
  margin-top: 10px;
}
</style>
