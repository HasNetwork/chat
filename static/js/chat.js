document.addEventListener("DOMContentLoaded", () => {
	const socket = io();
	let currentRoom = "";
	// Username is passed from the template via a global variable or data attribute
	// We will use a data attribute on the body tag for cleaner separation
	const username = document.body.dataset.username;

	const chatWindow = document.getElementById("chat-window");
	const messageInput = document.getElementById("message-input");
	const sendButton = document.getElementById("send-button");
	const uploadButton = document.getElementById("upload-button");
	const fileInput = document.getElementById("file-input");
	const menuBtn = document.getElementById("menu-btn");
	const sidebar = document.getElementById("sidebar");

	if (menuBtn) {
		menuBtn.addEventListener("click", () => {
			sidebar.classList.toggle("active");
		});

		// Close sidebar when clicking outside
		document.addEventListener("click", (e) => {
			if (
				!sidebar.contains(e.target) &&
				!menuBtn.contains(e.target) &&
				sidebar.classList.contains("active")
			) {
				sidebar.classList.remove("active");
			}
		});
	}

	const newRoomForm = document.getElementById("new-room-form");
	const newRoomInput = document.getElementById("new-room-input");
	const roomList = document.querySelector("#room-list ul");
	const onlineUsersList = document.querySelector("#online-users ul");
	const typingIndicator = document.getElementById("typing-indicator");

	function enableChat(enabled) {
		messageInput.disabled = !enabled;
		sendButton.disabled = !enabled;
		uploadButton.disabled = !enabled;
	}

	window.joinRoom = (room) => {
		if (currentRoom) {
			socket.emit("leave", { room: currentRoom });
		}
		chatWindow.innerHTML = "";
		socket.emit("join", { room: room });
		currentRoom = room;
		document.querySelectorAll("#room-list li").forEach((li) => {
			if (li.textContent === room) {
				li.classList.add("active");
			} else {
				li.classList.remove("active");
			}
		});
		enableChat(true);
	};

	newRoomForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const newRoomName = newRoomInput.value.trim();
		if (newRoomName) {
			if (
				![...roomList.children].some((li) => li.textContent === newRoomName)
			) {
				const newRoomElement = document.createElement("li");
				newRoomElement.textContent = newRoomName;
				newRoomElement.onclick = () => joinRoom(newRoomName);
				roomList.appendChild(newRoomElement);
			}
			joinRoom(newRoomName);
			newRoomInput.value = "";
		}
	});

	function scrollToBottom() {
		chatWindow.scrollTop = chatWindow.scrollHeight;
	}

	sendButton.addEventListener("click", () => {
		const message = messageInput.value.trim();
		const parentId = document.getElementById("reply-to").value;
		if (message && currentRoom) {
			socket.emit("send_message", {
				room: currentRoom,
				message: message,
				parent_id: parentId ? parseInt(parentId) : null,
			});
			messageInput.value = "";
			document.getElementById("reply-to").value = "";
		}
	});

	messageInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			sendButton.click();
		}
	});

	uploadButton.addEventListener("click", () => fileInput.click());

	fileInput.addEventListener("change", () => {
		const file = fileInput.files[0];
		if (file && currentRoom) {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("room", currentRoom);

			fetch("/upload", {
				method: "POST",
				body: formData,
			}).catch((error) => console.error("Error uploading file:", error));

			fileInput.value = "";
		}
	});

	function renderMessage(data) {
		const messageElement = document.createElement("div");
		messageElement.classList.add("message");
		messageElement.classList.add(
			data.user === username ? "my-message" : "other-message"
		);
		messageElement.dataset.messageId = data.id;

		const messageContent = document.createElement("div");
		messageContent.classList.add("message-content");
		messageContent.classList.add("glass-panel"); // Add glass effect

		if (data.is_deleted) {
			messageContent.innerHTML = `<p><i>This message was deleted</i></p>`;
		} else {
			if (data.parent_id) {
				const parentMessage = document.querySelector(
					`[data-message-id='${data.parent_id}']`
				);
				if (parentMessage) {
					const parentContent =
						parentMessage.querySelector(".message-text").textContent;
					messageContent.innerHTML += `<div class="reply-to">Replying to: <em>${parentContent}</em></div>`;
				}
			}

			if (data.is_file) {
				messageContent.innerHTML += `
                    <p class="message-sender"><strong>${data.user}</strong> uploaded a file</p>
                    <a href="${data.url}" target="_blank" class="file-link">${data.filename}</a>
                `;
			} else {
				messageContent.innerHTML += `
                    <p class="message-sender"><strong>${data.user}</strong></p>
                    <p class="message-text">${data.message}</p>
                `;
			}

			if (data.edited_at) {
				messageContent.innerHTML += `<span class="edited">(edited)</span>`;
			}

			// Action Buttons Container
			const actionsDiv = document.createElement("div");
			actionsDiv.classList.add("message-actions");

			if (data.user === username) {
				const editButton = document.createElement("button");
				editButton.innerHTML = "✏️";
				editButton.title = "Edit";
				editButton.classList.add("action-btn");
				editButton.onclick = () => {
					const newContent = prompt("Edit your message:", data.message);
					if (newContent) {
						socket.emit("edit_message", {
							message_id: data.id,
							new_content: newContent,
						});
					}
				};
				actionsDiv.appendChild(editButton);

				const deleteButton = document.createElement("button");
				deleteButton.innerHTML = "🗑️";
				deleteButton.title = "Delete";
				deleteButton.classList.add("action-btn");
				deleteButton.onclick = () => {
					if (confirm("Are you sure you want to delete this message?")) {
						socket.emit("delete_message", { message_id: data.id });
					}
				};
				actionsDiv.appendChild(deleteButton);
			}

			const replyButton = document.createElement("button");
			replyButton.innerHTML = "↩️";
			replyButton.title = "Reply";
			replyButton.classList.add("action-btn");
			replyButton.onclick = () => {
				document.getElementById("reply-to").value = data.id;
				const replyIndicator = document.getElementById("reply-indicator");
				if (replyIndicator) {
					replyIndicator.textContent = `Replying to: ${data.message.substring(
						0,
						20
					)}...`;
					replyIndicator.style.display = "block";
				}
				messageInput.focus();
			};
			actionsDiv.appendChild(replyButton);

			const reactButton = document.createElement("button");
			reactButton.innerHTML = "👍";
			reactButton.title = "React";
			reactButton.classList.add("action-btn");
			reactButton.onclick = () => {
				socket.emit("react_message", { message_id: data.id, emoji: "👍" });
			};
			actionsDiv.appendChild(reactButton);

			messageContent.appendChild(actionsDiv);
		}

		const timestamp = document.createElement("span");
		timestamp.classList.add("timestamp");
		timestamp.textContent = new Date(data.timestamp).toLocaleTimeString(
			"en-US",
			{
				timeZone: "Asia/Kolkata",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			}
		);
		messageContent.appendChild(timestamp); // Move timestamp inside

		const reactions = document.createElement("div");
		reactions.classList.add("reactions");
		if (data.reactions) {
			data.reactions.forEach((r) => {
				const reaction = document.createElement("span");
				reaction.textContent = r.emoji;
				reactions.appendChild(reaction);
			});
		}
		messageContent.appendChild(reactions); // Move reactions inside

		// Remove per-message seen-by
		// const seenBy = document.createElement("div");
		// ...

		messageElement.appendChild(messageContent);

		// Emit seen event if it's not my message and I haven't seen it yet
		if (data.user !== username) {
			// Simple intersection observer to check if message is in view
			const observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						socket.emit("message_seen", { message_id: data.id });
						observer.unobserve(entry.target);
					}
				});
			});
			observer.observe(messageElement);
		}

		return messageElement;
	}

	// ... (getISTDateString, renderDateSeparator, appendMessage) ...

	socket.on("receive_message", (data) => {
		appendMessage(data);
		// Clear global seen status when new message arrives
		const globalSeen = document.getElementById("global-seen-status");
		if (globalSeen) globalSeen.textContent = "";
	});

	// ... (load_history) ...

	socket.on("message_seen_by", (data) => {
		// Only update if it's the last message
		const lastMessage = document.querySelector(".message:last-child");
		if (lastMessage && lastMessage.dataset.messageId == data.message_id) {
			const globalSeen = document.getElementById("global-seen-status");
			if (globalSeen) {
				if (data.seen_by.length > 0) {
					globalSeen.textContent = `Seen by: ${data.seen_by.join(", ")}`;
					globalSeen.style.display = "block";
				} else {
					globalSeen.style.display = "none";
				}
			}
		}
	});

	let lastMessageDate = null;

	function getISTDateString(date) {
		return new Date(date).toLocaleDateString("en-US", {
			timeZone: "Asia/Kolkata",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	function renderDateSeparator(dateString) {
		const separator = document.createElement("div");
		separator.classList.add("date-separator");
		separator.innerHTML = `<span>${dateString}</span>`;
		return separator;
	}

	function appendMessage(data) {
		const messageDate = getISTDateString(data.timestamp);

		if (messageDate !== lastMessageDate) {
			chatWindow.appendChild(renderDateSeparator(messageDate));
			lastMessageDate = messageDate;
		}

		const messageElement = renderMessage(data);
		chatWindow.appendChild(messageElement);
		scrollToBottom();
	}

	socket.on("load_history", (history) => {
		chatWindow.innerHTML = "";
		lastMessageDate = null; // Reset for new history load
		history.forEach(appendMessage);

		// Update seen status for the last message in history
		if (history.length > 0) {
			const lastMsg = history[history.length - 1];
			const globalSeen = document.getElementById("global-seen-status");
			if (globalSeen && lastMsg.seen_by && lastMsg.seen_by.length > 0) {
				globalSeen.textContent = `Seen by: ${lastMsg.seen_by.join(", ")}`;
				globalSeen.style.display = "block";
			}
		}
	});

	socket.on("message_edited", (data) => {
		console.log("Message edited event received:", data);
		const messageElement = document.querySelector(
			`[data-message-id='${data.message_id}']`
		);
		if (messageElement) {
			messageElement.querySelector(".message-text").textContent =
				data.new_content;
			messageElement.querySelector(".edited").style.display = "inline";
		} else {
			console.warn("Message element not found for edit:", data.message_id);
		}
	});

	socket.on("message_deleted", (data) => {
		console.log("Message deleted event received:", data);
		const messageElement = document.querySelector(
			`[data-message-id='${data.message_id}']`
		);
		if (messageElement) {
			messageElement.querySelector(
				".message-content"
			).innerHTML = `<p><i>This message was deleted</i></p>`;
		} else {
			console.warn("Message element not found for delete:", data.message_id);
		}
	});

	socket.on("message_reacted", (data) => {
		const messageElement = document.querySelector(
			`[data-message-id='${data.message_id}']`
		);
		if (messageElement) {
			const reactionsDiv = messageElement.querySelector(".reactions");
			reactionsDiv.innerHTML = "";
			data.reactions.forEach((r) => {
				const reaction = document.createElement("span");
				reaction.textContent = r.emoji;
				reactionsDiv.appendChild(reaction);
			});
		}
	});

	// message_seen_by is already defined above, removing duplicate

	socket.on("user_status", (data) => {
		onlineUsersList.innerHTML = "";
		data.online_users.forEach((user) => {
			const userElement = document.createElement("li");
			userElement.textContent = user;
			onlineUsersList.appendChild(userElement);
		});
	});

	socket.on("typing", (data) => {
		if (data.is_typing) {
			typingIndicator.textContent = `${data.user} is typing...`;
		} else {
			typingIndicator.textContent = "";
		}
	});

	let typingTimeout;
	messageInput.addEventListener("input", () => {
		clearTimeout(typingTimeout);
		socket.emit("typing", { room: currentRoom, is_typing: true });
		typingTimeout = setTimeout(() => {
			socket.emit("typing", { room: currentRoom, is_typing: false });
		}, 3000);
	});
});
